import React, { useState, useEffect } from 'react';
import { Input, Button, message, Spin, Divider, Space, Typography } from 'antd';
import { extractXiaohongshuInfo } from './services/xiaohongshuService';
import { XiaohongshuInfo, Comment } from './types/xiaohongshu';
// 直接导入 SDK，但在组件内部使用动态导入方式
import { bitable, FieldType } from '@lark-base-open/js-sdk';

// 类型定义
type ITable = any;

const { Title, Paragraph } = Typography;

interface RequiredField {
  name: string;
  type: typeof FieldType[keyof typeof FieldType]; // 使用 FieldType 类型
  property?: Record<string, any>;
  isMultiline?: boolean;
}

const App: React.FC = () => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [noteInfo, setNoteInfo] = useState<XiaohongshuInfo | null>(null);
  const [table, setTable] = useState<ITable | null>(null);
  const [processing, setProcessing] = useState<boolean>(false);

  // 初始化表格
  useEffect(() => {
    const initTable = async () => {
      try {
        // 根据最新的 API 文档，正确使用 bitable API
        const selection = await bitable.base.getSelection();
        if (selection.tableId) {
          const activeTable = await bitable.base.getTableById(selection.tableId);
          setTable(activeTable);
        } else {
          message.warning('请先选择一个数据表');
        }
      } catch (error) {
        console.error('获取当前表格失败:', error);
        message.error('获取当前表格失败，请刷新重试');
      }
    };

    initTable();
  }, []);

  const handleUrlChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setUrl(e.target.value);
  };

  const extractUrl = (text: string): string | null => {
    // 匹配小红书链接的正则表达式
    const regex = /(https?:\/\/(?:www\.)?xiaohongshu\.com\/(?:discovery\/item|explore)\/(\w+))/i;
    const match = text.match(regex);
    return match ? match[1] : null;
  };

  const handleExtract = async () => {
    const extractedUrl = extractUrl(url);
    if (!extractedUrl) {
      message.error('请输入有效的小红书链接');
      return;
    }

    setLoading(true);
    try {
      const info = await extractXiaohongshuInfo(extractedUrl);
      setNoteInfo(info);
      message.success('提取成功');
    } catch (error) {
      console.error('提取失败:', error);
      message.error('提取失败，请检查链接是否有效');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToTable = async () => {
    if (!noteInfo || !table) {
      message.error('没有可保存的数据或未选择表格');
      return;
    }

    setProcessing(true);
    try {
      // 检查并创建必要的字段
      await ensureFields(table);

      // 创建新记录
      await table.addRecord({
        fields: {
          '小红书链接': url,
          '标题': noteInfo.title,
          '博主': noteInfo.author,
          '发布时间': noteInfo.publishTime,
          '文案': noteInfo.content,
          '话题标签': noteInfo.tags.join(','),
          '封面图片': [{ type: 'url', value: noteInfo.coverImage }],
          '热门评论': noteInfo.comments.map((c: Comment) => `${c.user}: ${c.content}`).join('\n')
        }
      });

      message.success('已保存到表格');
    } catch (error) {
      console.error('保存到表格失败:', error);
      message.error('保存到表格失败');
    } finally {
      setProcessing(false);
    }
  };

  const ensureFields = async (table: ITable) => {
    // 获取现有字段
    const fields = await table.getFieldMetaList();
    const fieldMap = new Map(fields.map((field: any) => [field.name, field]));

    // 需要确保的字段列表
    const requiredFields: RequiredField[] = [
      { name: '小红书链接', type: FieldType.Text },
      { name: '标题', type: FieldType.Text },
      { name: '博主', type: FieldType.Text },
      { name: '发布时间', type: FieldType.DateTime },
      { name: '文案', type: FieldType.Text, isMultiline: true },
      { name: '话题标签', type: FieldType.Text },
      { name: '封面图片', type: FieldType.Attachment },
      { name: '热门评论', type: FieldType.Text, isMultiline: true }
    ];

    // 创建缺失的字段
    for (const field of requiredFields) {
      if (!fieldMap.has(field.name)) {
        if (field.type === FieldType.Text && field.isMultiline) {
          await table.addField({
            type: field.type,
            name: field.name,
            property: {
              defaultValue: '',
              formatter: 'none',
              multiline: true
            }
          });
        } else {
          await table.addField({
            type: field.type,
            name: field.name
          });
        }
      }
    }
  };

  return (
    <div className="app-container">
      <Title level={3}>小红书内容提取助手</Title>
      <Paragraph>粘贴小红书链接，一键提取笔记内容信息并保存到多维表格</Paragraph>
      
      <div className="section">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input.TextArea 
            value={url} 
            onChange={handleUrlChange} 
            placeholder="请粘贴小红书笔记链接" 
            rows={3} 
          />
          <Button 
            type="primary" 
            onClick={handleExtract} 
            loading={loading}
            block
          >
            提取内容
          </Button>
        </Space>
      </div>

      {loading && (
        <div className="loading-container">
          <Spin tip="正在提取内容..." />
        </div>
      )}

      {noteInfo && !loading && (
        <div className="result-container">
          <Title level={4}>提取结果</Title>
          
          <div className="result-item">
            <div className="result-item-title">封面图片</div>
            <img src={noteInfo.coverImage} alt="封面" className="preview-image" />
          </div>
          
          <Divider style={{ margin: '12px 0' }} />
          
          <div className="result-item">
            <div className="result-item-title">标题</div>
            <div className="result-item-content">{noteInfo.title}</div>
          </div>
          
          <div className="result-item">
            <div className="result-item-title">博主</div>
            <div className="result-item-content">{noteInfo.author}</div>
          </div>
          
          <div className="result-item">
            <div className="result-item-title">发布时间</div>
            <div className="result-item-content">{noteInfo.publishTime}</div>
          </div>
          
          <div className="result-item">
            <div className="result-item-title">文案</div>
            <div className="result-item-content">{noteInfo.content}</div>
          </div>
          
          <div className="result-item">
            <div className="result-item-title">话题标签</div>
            <div className="tag-list">
              {noteInfo.tags.map((tag: string, index: number) => (
                <span key={index} className="tag">{tag}</span>
              ))}
            </div>
          </div>
          
          <div className="result-item">
            <div className="result-item-title">热门评论</div>
            <div className="comment-list">
              {noteInfo.comments.map((comment: Comment, index: number) => (
                <div key={index} className="comment-item">
                  <div className="comment-user">{comment.user}</div>
                  <div className="comment-content">{comment.content}</div>
                </div>
              ))}
            </div>
          </div>
          
          <Divider style={{ margin: '16px 0' }} />
          
          <Button 
            type="primary" 
            onClick={handleSaveToTable} 
            loading={processing}
            block
          >
            保存到表格
          </Button>
        </div>
      )}
    </div>
  );
};

export default App;