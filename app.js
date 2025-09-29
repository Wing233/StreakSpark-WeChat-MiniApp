// App.js
App({
  globalData: {
    tasks: [],
    userInfo: null
  },

  onLaunch: function() {
    // 初始化云开发环境
    if (wx.cloud) {
      wx.cloud.init({
        env: wx.cloud.DYNAMIC_CURRENT_ENV, // 使用当前项目配置的云开发环境
        traceUser: true,
      });
    }

    // 加载本地存储的任务数据
    this.loadTasksFromStorage();
  },

  onShow: function() {
    // 页面显示时的处理
  },

  onHide: function() {
    // 页面隐藏时的处理
  },

  onError: function(error) {
    // 错误处理
    console.error('App error:', error);
  },

  // 加载本地存储的任务数据
  loadTasksFromStorage: function() {
    try {
      const tasks = wx.getStorageSync('tasks');
      if (tasks) {
        this.globalData.tasks = JSON.parse(tasks);
      }
    } catch (error) {
      console.error('加载本地存储任务数据失败:', error);
    }
  },

  // 保存任务数据到本地存储
  saveTasksToStorage: function() {
    try {
      wx.setStorageSync('tasks', JSON.stringify(this.globalData.tasks));
    } catch (error) {
      console.error('保存任务数据到本地存储失败:', error);
    }
  },

  // 全局事件管理
  _events: {},

  // 注册全局事件监听
  onGlobalEvent: function(eventName, callback) {
    if (!this._events[eventName]) {
      this._events[eventName] = [];
    }
    this._events[eventName].push(callback);
  },

  // 移除全局事件监听
  offGlobalEvent: function(eventName, callback) {
    if (!this._events[eventName]) return;
    
    if (callback) {
      // 移除特定的回调函数
      const index = this._events[eventName].indexOf(callback);
      if (index > -1) {
        this._events[eventName].splice(index, 1);
      }
    } else {
      // 移除所有回调函数
      this._events[eventName] = [];
    }
  },

  // 触发全局事件
  triggerGlobalEvent: function(eventName, data) {
    if (!this._events[eventName]) return;
    
    this._events[eventName].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`触发全局事件 ${eventName} 失败:`, error);
      }
    });
  }
});