/**
 * 小红书笔记信息接口定义
 */
export interface XiaohongshuInfo {
  /**
   * 笔记标题
   */
  title: string;
  
  /**
   * 笔记作者/博主
   */
  author: string;
  
  /**
   * 发布时间
   */
  publishTime: string;
  
  /**
   * 笔记封面图片URL
   */
  coverImage: string;
  
  /**
   * 笔记正文内容
   */
  content: string;
  
  /**
   * 话题标签列表
   */
  tags: string[];
  
  /**
   * 热门评论列表
   */
  comments: Comment[];
}

/**
 * 评论信息接口定义
 */
export interface Comment {
  /**
   * 评论用户名
   */
  user: string;
  
  /**
   * 评论内容
   */
  content: string;
}