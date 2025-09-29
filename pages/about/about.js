Page({
  data: {
    showPasswordModal: false,
    password: ''
  },

  onLoad: function() {
    // 页面加载逻辑
  },

  onShow: function() {
    // 页面显示逻辑
  },

  // 显示归档确认弹窗
  showArchiveConfirm: function() {
    this.setData({
      showPasswordModal: true,
      password: ''
    });
  },

  // 处理密码输入
  onPasswordInput: function(e) {
    this.setData({
      password: e.detail.value
    });
  },

  // 取消归档
  cancelArchive: function() {
    this.setData({
      showPasswordModal: false,
      password: ''
    });
  },

  // 确认归档
  confirmArchive: function() {
    const { password } = this.data;
    
    // 验证密码
    if (password !== '000620') {
      wx.showToast({
        title: '密码错误',
        icon: 'none'
      });
      return;
    }
    
    // 关闭弹窗
    this.setData({
      showPasswordModal: false,
      password: ''
    });
    
    // 显示加载提示
    wx.showLoading({
      title: '归档中...',
    });
    
    // 调用归档云函数
    wx.cloud.callFunction({
      name: 'archiveTasks',
      data: {}
    })
    .then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        wx.showToast({
          title: `归档成功，共${res.result.archivedCount}条记录`,
          icon: 'success'
        });
        
        // 触发全局任务更新事件
        try {
          const app = getApp();
          app.triggerGlobalEvent('tasksUpdated');
        } catch (err) {
          console.error('触发全局事件失败:', err);
        }
      } else {
        console.error('归档失败:', res);
        wx.showToast({
          title: '归档失败',
          icon: 'none'
        });
      }
    })
    .catch(err => {
      wx.hideLoading();
      console.error('调用归档云函数失败:', err);
      wx.showToast({
        title: '归档失败',
        icon: 'none'
      });
    });
  },

  // 分享功能
  onShareAppMessage: function() {
    return {
      title: '任务管理助手',
      path: '/pages/index/index',
      imageUrl: '/assets/images/share.jpg'
    };
  }
});