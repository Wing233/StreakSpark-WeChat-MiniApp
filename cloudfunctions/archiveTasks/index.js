// 云函数入口文件
const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const _ = db.command;

// 云函数入口函数
exports.main = async (event, context) => {
  console.log('=== 归档任务开始执行 ===');
  console.log('触发来源:', context && context.source || '未知');
  console.log('触发时间:', new Date().toISOString());
  console.log('事件参数:', event);
  
  try {
    console.log('开始执行数据归档任务');
    
    // 查询所有任务数据
    const tasksToArchive = await db.collection('tasks')
      .get();
    
    console.log(`找到${tasksToArchive.data.length}个需要归档的任务`);
    
    if (tasksToArchive.data.length === 0) {
      console.log('没有需要归档的任务，结束执行');
      return {
        success: true,
        message: '没有需要归档的任务',
        archivedCount: 0
      };
    }
    
    // 创建归档记录
    const archivePromises = tasksToArchive.data.map(task => {
      // 解构task对象，排除原始的_id字段
      const { _id, ...taskWithoutId } = task;
      
      // 为归档记录添加归档时间和原始ID
      const archiveData = {
        ...taskWithoutId,
        originalId: _id,  // 单独保存原始ID
        archivedAt: db.serverDate(),
        _archived: true
      };
      
      // 将任务添加到归档集合，add方法会自动生成新的唯一_id
      return db.collection('archives').add({
        data: archiveData
      }).catch(err => {
        console.error(`归档任务ID:${_id}失败:`, err);
        throw err;
      });
    });
    
    // 等待所有归档操作完成
    console.log('开始批量创建归档记录...');
    const archiveResults = await Promise.all(archivePromises);
    console.log(`成功创建${archiveResults.length}条归档记录`);
    
    // 更新原任务集合中的所有任务：设置completed为false，更新updatedAt为当前时间
    const updatePromises = tasksToArchive.data.map(task => {
      return db.collection('tasks').doc(task._id).update({
        data: {
          completed: false,
          updatedAt: db.serverDate(),
          completedAt: null
        }
      }).catch(err => {
        console.error(`更新任务ID:${task._id}失败:`, err);
        throw err;
      });
    });
    
    // 等待所有更新操作完成
    console.log('开始批量更新原任务...');
    const updateResults = await Promise.all(updatePromises);
    console.log(`成功更新${updateResults.length}个原任务`);
    
    console.log(`成功归档并更新了${tasksToArchive.data.length}个任务`);
    console.log('=== 归档任务执行成功 ===');
    
    return {
      success: true,
      message: '数据归档和任务更新成功',
      archivedCount: tasksToArchive.data.length,
      updatedCount: tasksToArchive.data.length,
      executionTime: new Date().toISOString()
    };
    
  } catch (error) {
    console.error('数据归档失败:', error);
    console.log('=== 归档任务执行失败 ===');
    return {
      success: false,
      error: error.message,
      stack: error.stack,
      archivedCount: 0,
      executionTime: new Date().toISOString()
    };
  }
};