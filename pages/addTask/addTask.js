// 添加/编辑任务页面逻辑
Page({
  data: {
    isEdit: false,
    taskId: null,
    task: {
      title: '',
      description: '',
      completed: false
    },
    errorMessage: ''
  },

  onLoad: function(options) {
    // 检查是否为编辑模式
    if (options && options.id) {
      this.setData({
        isEdit: true,
        taskId: options.id
      });
      this.loadTaskData(options.id);
    }
  },

  // 加载任务数据（编辑模式）
  loadTaskData: function(taskId) {
    const db = wx.cloud.database();
    
    wx.showLoading({
      title: '加载中...',
    });
    
    db.collection('tasks').doc(taskId).get()
      .then(res => {
        this.setData({
          task: res.data
        });
        wx.hideLoading();
      })
      .catch(err => {
        console.error('加载任务数据失败:', err);
        wx.showToast({
          title: '加载任务失败',
          icon: 'none'
        });
        // 如果加载失败，返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
        wx.hideLoading();
      });
  },

  // 监听标题输入
  onTitleInput: function(e) {
    const title = e.detail.value;
    this.setData({
      'task.title': title,
      errorMessage: '' // 清除错误提示
    });
  },

  // 监听描述输入
  onDescriptionInput: function(e) {
    const description = e.detail.value;
    this.setData({
      'task.description': description
    });
  },

  // 监听完成状态切换
  onCompletedChange: function(e) {
    const completed = e.detail.value;
    this.setData({
      'task.completed': completed
    });
  },

  // 保存任务
  saveTask: function() {
    const { task, isEdit } = this.data;
    
    // 表单验证
    if (!task.title || task.title.trim() === '') {
      wx.showToast({
        title: '请输入任务标题',
        icon: 'none'
      });
      return;
    }
    
    wx.showLoading({
      title: isEdit ? '更新中...' : '创建中...',
    });
    
    // 准备任务数据
    const taskData = {
      title: task.title.trim(),
      description: task.description || '',
      completed: task.completed || false,
      updatedAt: new Date().getTime()
    };
    
    if (isEdit) {
      // 更新任务
      wx.cloud.callFunction({
        name: 'updateTask',
        data: {
          taskId: task._id,
          ...taskData
        }
      })
      .then(res => {
        if (res.result.success) {
          wx.hideLoading();
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          
          // 触发全局任务更新事件
          const app = getApp();
          app.triggerGlobalEvent('tasksUpdated');
          
          // 返回到任务列表页面
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        } else {
          console.error('更新任务失败:', res);
          wx.hideLoading();
          wx.showToast({
            title: '更新失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('调用云函数失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
    } else {
      // 创建新任务
      taskData.createdAt = new Date().getTime();
      
      wx.cloud.callFunction({
        name: 'createTask',
        data: taskData
      })
      .then(res => {
        if (res.result.success) {
          wx.hideLoading();
          wx.showToast({
            title: '创建成功',
            icon: 'success'
          });
          
          // 触发全局任务更新事件
          const app = getApp();
          app.triggerGlobalEvent('tasksUpdated');
          
          // 自动跳转至主页
          setTimeout(() => {
            wx.switchTab({
              url: '/pages/index/index'
            });
          }, 1500);
        } else {
          console.error('创建任务失败:', res);
          wx.hideLoading();
          wx.showToast({
            title: '创建失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('调用云函数失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '操作失败',
          icon: 'none'
        });
      });
    }
  }
});