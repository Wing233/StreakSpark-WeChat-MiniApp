// 任务详情页面逻辑
Page({
    data: {
        task: null,
        taskId: ''
    },

    onLoad(options) {
        // 从页面参数中获取任务ID
        if (options.id) {
            this.setData({
                taskId: options.id
            });
            this.loadTaskDetail();
        }
    },

    // 格式化时间戳为日期字符串
    formatTimestamp: function (timestamp) {
        if (!timestamp || isNaN(timestamp)) {
            return '未知时间';
        }

        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');

        return `${year}-${month}-${day} ${hours}:${minutes}`;
    },

    // 格式化单个时间字段
    formatTimeField: function (timeData) {
        if (!timeData) {
            return null;
        }

        try {
            let timestamp = null;

            if (typeof timeData === 'number') {
                // 已经是时间戳
                timestamp = timeData;
            } else if (typeof timeData === 'string') {
                // 字符串格式，尝试转换
                const date = new Date(timeData);
                timestamp = date.getTime();
            } else if (typeof timeData === 'object' && timeData._seconds) {
                // 处理云数据库的时间对象格式
                timestamp = timeData._seconds * 1000;
            } else if (typeof timeData === 'object' && timeData.getTime && typeof timeData.getTime === 'function') {
                timestamp = timeData.getTime();
            } else {
                // 最后尝试将其转换为字符串再解析
                const timeStr = String(timeData);
                const date = new Date(timeStr);
                timestamp = date.getTime();
            }

            // 检查是否为有效时间戳
            if (isNaN(timestamp)) {
                console.warn('无效的时间数据，无法转换为时间戳:', timeData);
                return null;
            }

            return timestamp;
        } catch (error) {
            console.error('获取时间戳失败:', error, '原始数据:', timeData);
            return null;
        }
    },

    // 加载任务详情
    loadTaskDetail() {
        const {taskId} = this.data;
        const db = wx.cloud.database();

        wx.showLoading({
            title: '加载中...',
        });

        db.collection('tasks').doc(taskId).get()
            .then(res => {
                const task = res.data;

                // 处理时间字段
                const formattedTask = {...task};

                // 处理创建时间
                if (task.createdAt) {
                    const createdAtTimestamp = this.formatTimeField(task.createdAt);
                    if (createdAtTimestamp !== null) {
                        formattedTask.createdAt = createdAtTimestamp;
                        formattedTask.formattedCreatedAt = this.formatTimestamp(createdAtTimestamp);
                    }
                }

                // 处理更新时间
                if (task.updatedAt) {
                    const updatedAtTimestamp = this.formatTimeField(task.updatedAt);
                    if (updatedAtTimestamp !== null) {
                        formattedTask.updatedAt = updatedAtTimestamp;
                        formattedTask.formattedUpdatedAt = this.formatTimestamp(updatedAtTimestamp);
                    }
                }

                // 处理完成时间
                if (task.completedAt) {
                    const completedAtTimestamp = this.formatTimeField(task.completedAt);
                    if (completedAtTimestamp !== null) {
                        formattedTask.completedAt = completedAtTimestamp;
                        formattedTask.formattedCompletedAt = this.formatTimestamp(completedAtTimestamp);
                    }
                }

                this.setData({
                    task: formattedTask
                });
                wx.hideLoading();
            })
            .catch(err => {
                console.error('加载任务数据失败:', err);
                wx.hideLoading();
                wx.showToast({
                    title: '加载任务失败',
                    icon: 'none'
                });
            });
    },

    // 切换任务完成状态
    toggleTaskCompletion: function () {
        const {task} = this.data;
        const newCompletedStatus = !task.completed;

        wx.showLoading({
            title: '更新中...',
        });

        // 调用云函数更新任务状态
        wx.cloud.callFunction({
            name: 'updateTask',
            data: {
                taskId: task._id,
                completed: newCompletedStatus,
                completedAt: newCompletedStatus ? new Date().getTime() : null
            }
        })
            .then(res => {
                if (res.result.success) {
                    // 重新加载任务数据
                    this.loadTaskDetail();

                    // 触发全局任务更新事件
                    const app = getApp();
                    app.triggerGlobalEvent('tasksUpdated');

                    wx.showToast({
                        title: newCompletedStatus ? '任务已完成' : '任务已恢复',
                        icon: 'success'
                    });
                    // 自动跳转至主页
                    setTimeout(() => {
                        wx.switchTab({
                            url: '/pages/index/index'
                        });
                    }, 1500);
                } else {
                    console.error('更新任务状态失败:', res);
                    wx.showToast({
                        title: '更新失败',
                        icon: 'none'
                    });
                }
                wx.hideLoading();
            })
            .catch(err => {
                console.error('调用云函数失败:', err);
                wx.showToast({
                    title: '操作失败',
                    icon: 'none'
                });
                wx.hideLoading();
            });
    },

    // 删除任务
    deleteTask: function () {
        wx.showModal({
            title: '确认删除',
            content: '确定要删除这个任务吗？',
            success: res => {
                if (res.confirm) {
                    this.performDeleteTask();
                }
            }
        });
    },

    // 执行删除任务
    performDeleteTask: function () {
        const taskId = this.data.taskId;

        wx.showLoading({
            title: '删除中...',
        });

        // 调用云函数删除任务
        wx.cloud.callFunction({
            name: 'deleteTask',
            data: {
                taskId: taskId
            }
        })
            .then(res => {
                if (res.result.success) {
                    // 触发全局任务更新事件
                    const app = getApp();
                    app.triggerGlobalEvent('tasksUpdated');

                    // 返回到任务列表页面
                    wx.navigateBack();

                    wx.showToast({
                        title: '删除成功',
                        icon: 'success'
                    });
                } else {
                    console.error('删除任务失败:', res);
                    wx.showToast({
                        title: '删除失败',
                        icon: 'none'
                    });
                }
                wx.hideLoading();
            })
            .catch(err => {
                console.error('调用云函数失败:', err);
                wx.showToast({
                    title: '操作失败',
                    icon: 'none'
                });
                wx.hideLoading();
            });
    }
});