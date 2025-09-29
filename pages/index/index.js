// 任务列表页面逻辑
Page({
  data: {
    tasks: [],
    filteredTasks: [],
    currentDate: '',
    activeTab: 'all',
    showActionMenu: false,
    currentTaskId: null,
    currentTaskIndex: null
  },

  onLoad: function() {
    // 初始化页面数据
    this.setCurrentDate();
    this.loadTasks();
    
    // 监听全局任务更新事件
    try {
      const app = getApp();
      if (app && app.onGlobalEvent) {
        app.onGlobalEvent('tasksUpdated', this.loadTasks.bind(this));
      }
    } catch (err) {
      console.error('注册全局事件监听失败:', err);
    }
  },

  onShow: function() {
    // 页面显示时重新加载任务数据
    this.loadTasks();
  },

  onPullDownRefresh: function() {
    // 下拉刷新
    this.loadTasks(() => {
      wx.stopPullDownRefresh();
    });
  },

  onUnload: function() {
    // 页面卸载时移除全局事件监听
    try {
      const app = getApp();
      if (app && app.offGlobalEvent) {
        app.offGlobalEvent('tasksUpdated', this.loadTasks.bind(this));
      }
    } catch (err) {
      console.error('移除全局事件监听失败:', err);
    }
  },

  // 设置当前日期
  setCurrentDate: function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const weekday = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'][now.getDay()];
    
    this.setData({
      currentDate: `${year}年${month}月${day}日 ${weekday}`
    });
  },

  // 格式化时间戳为日期字符串
  formatTimestamp: function(timestamp) {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  },

  // 格式化单个时间字段
  formatTimeField: function(timeData) {
    if (!timeData) return null;
    
    try {
      let timestamp;
      
      // 尝试多种方式获取时间戳
      if (typeof timeData === 'number' && !isNaN(timeData)) {
        timestamp = timeData;
      } else if (timeData instanceof Date || Object.prototype.toString.call(timeData) === '[object Date]') {
        timestamp = timeData.getTime();
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

  // 加载任务数据
  loadTasks: function(callback) {
    const db = wx.cloud.database();
    
    wx.showLoading({
      title: '加载中...',
    });
    
    db.collection('tasks').orderBy('createdAt', 'desc').get()
      .then(res => {
        
        // 处理任务数据中的时间字段
        const processedTasks = res.data.map(task => {
          const processedTask = { ...task };
          
          // 处理创建时间
          if (task.createdAt) {
            const createdAtTimestamp = this.formatTimeField(task.createdAt);
            if (createdAtTimestamp !== null) {
              processedTask.createdAt = createdAtTimestamp;
              processedTask.formattedCreatedAt = this.formatTimestamp(createdAtTimestamp);
            }
          }
          
          // 处理更新时间
          if (task.updatedAt) {
            const updatedAtTimestamp = this.formatTimeField(task.updatedAt);
            if (updatedAtTimestamp !== null) {
              processedTask.updatedAt = updatedAtTimestamp;
              processedTask.formattedUpdatedAt = this.formatTimestamp(updatedAtTimestamp);
            }
          }
          
          // 处理完成时间
          if (task.completedAt) {
            const completedAtTimestamp = this.formatTimeField(task.completedAt);
            if (completedAtTimestamp !== null) {
              processedTask.completedAt = completedAtTimestamp;
              processedTask.formattedCompletedAt = this.formatTimestamp(completedAtTimestamp);
            }
          }
          
          return processedTask;
        });
        
        
        // 更新全局任务数据
        try {
          const app = getApp();
          if (app && app.globalData && app.saveTasksToStorage) {
            app.globalData.tasks = processedTasks;
            app.saveTasksToStorage();
          }
        } catch (err) {
          console.error('更新全局任务数据失败:', err);
        }
        
        // 更新页面数据
        this.setData({
          tasks: processedTasks
        });
        
        // 应用筛选
        this.filterTasks();
        wx.hideLoading();
        if (callback) callback();
      }).catch(err => {
        console.error('加载任务数据失败:', err);
        wx.showToast({
          title: '加载任务失败',
          icon: 'none'
        });
        
        // 从本地存储加载数据
        const tasks = wx.getStorageSync('tasks');
        if (tasks) {
          this.setData({
            tasks: JSON.parse(tasks)
          });
          this.filterTasks();
        }
        wx.hideLoading();
        if (callback) callback();
      });
  },

  // 切换筛选标签
  switchTab: function(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({
      activeTab: tab
    });
    this.filterTasks();
  },

  // 筛选任务
  filterTasks: function() {
    const { tasks, activeTab } = this.data;
    let filteredTasks = [];
    
    switch (activeTab) {
      case 'all':
        filteredTasks = tasks;
        break;
      case 'pending':
        filteredTasks = tasks.filter(task => !task.completed);
        break;
      case 'completed':
        filteredTasks = tasks.filter(task => task.completed);
        break;
    }
    
    // 应用优先级排序：1.未完成状态 2.更新时间(降序) 3.创建时间(降序)
    filteredTasks.sort((a, b) => {
      // 首要优先级：未完成状态排在最上方
      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }
      
      // 第二优先级：按更新时间降序排序
      if (a.updatedAt && b.updatedAt) {
        return b.updatedAt - a.updatedAt;
      }
      if (a.updatedAt) {
        return -1;
      }
      if (b.updatedAt) {
        return 1;
      }
      
      // 第三优先级：按创建时间降序排序
      if (a.createdAt && b.createdAt) {
        return b.createdAt - a.createdAt;
      }
      if (a.createdAt) {
        return -1;
      }
      if (b.createdAt) {
        return 1;
      }
      
      return 0;
    });
    
    this.setData({
      filteredTasks
    });
  },

  // 选择任务
  selectTask: function(e) {
    const index = e.currentTarget.dataset.index;
    const task = this.data.filteredTasks[index];
    this.toggleTaskStatus(task._id, !task.completed);
  },

  // 切换任务状态
  toggleTaskStatus: function(taskId, completed) {
    wx.showLoading({
      title: '处理中...',
    });
    
    // 调用updateTask云函数
    wx.cloud.callFunction({
      name: 'updateTask',
      data: {
        taskId: taskId,
        completed: completed
      }
    })
    .then(res => {
      if (res.result.success) {
        // 重新加载任务数据
        this.loadTasks();
        // 触发全局任务更新事件
        const app = getApp();
        app.triggerGlobalEvent('tasksUpdated');
      } else {
        console.error('更新任务状态失败:', res);
        wx.showToast({
          title: '操作失败',
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

  // 跳转到任务详情
  goToDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/detail/detail?id=${id}`
    });
  },

  // 显示操作菜单
  showActionMenu: function(e) {
    const id = e.currentTarget.dataset.id;
    const index = e.currentTarget.dataset.index;
    this.setData({
      showActionMenu: true,
      currentTaskId: id,
      currentTaskIndex: index
    });
  },

  // 关闭操作菜单
  closeActionMenu: function() {
    this.setData({
      showActionMenu: false
    });
  },

  // 编辑任务
  editTask: function() {
    const id = this.data.currentTaskId;
    wx.navigateTo({
      url: `/pages/addTask/addTask?id=${id}`
    });
  },

  // 删除任务
  deleteTask: function() {
    const id = this.data.currentTaskId;
    const index = this.data.currentTaskIndex;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个任务吗？',
      success: res => {
        if (res.confirm) {
          this.performDeleteTask(id);
        }
      }
    });
  },

  // 执行删除任务
  performDeleteTask: function(taskId) {
    wx.showLoading({
      title: '删除中...',
    });
    
    // 调用deleteTask云函数
    wx.cloud.callFunction({
      name: 'deleteTask',
      data: {
        taskId: taskId
      }
    })
    .then(res => {
      if (res.result.success) {
        // 重新加载任务数据
        this.loadTasks();
        // 触发全局任务更新事件
        const app = getApp();
        app.triggerGlobalEvent('tasksUpdated');
        
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
  },

  // 阻止事件冒泡
  stopPropagation: function(e) {
    e.stopPropagation();
  }
});