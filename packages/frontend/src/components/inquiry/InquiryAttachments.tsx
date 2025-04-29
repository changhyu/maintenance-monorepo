import React, { useState } from 'react';
import { Upload, Button, List, Typography, Popconfirm, message, Space } from 'antd';
import { UploadOutlined, FileOutlined, PictureOutlined, FilePdfOutlined, FileExcelOutlined, FileWordOutlined, DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Text } = Typography;

export interface AttachmentFile {
  name: string;
  url: string;
  type: string;
  size: number;
}

interface InquiryAttachmentsProps {
  attachments?: AttachmentFile[];
  inquiryId: string;
  readOnly?: boolean;
  onChange?: (files: AttachmentFile[]) => void;
}

const getFileIcon = (fileType: string) => {
  if (fileType.includes('image')) return <PictureOutlined />;
  if (fileType.includes('pdf')) return <FilePdfOutlined />;
  if (fileType.includes('excel') || fileType.includes('spreadsheet')) return <FileExcelOutlined />;
  if (fileType.includes('word') || fileType.includes('document')) return <FileWordOutlined />;
  return <FileOutlined />;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const InquiryAttachments: React.FC<InquiryAttachmentsProps> = ({ 
  attachments = [], 
  inquiryId,
  readOnly = false,
  onChange 
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>(
    attachments.map((file, index) => ({
      uid: `-${index}`,
      name: file.name,
      status: 'done',
      url: file.url,
      size: file.size,
      type: file.type
    }))
  );

  const handleDownload = (file: AttachmentFile) => {
    try {
      // 실제 환경에서는 파일 URL을 이용해 다운로드
      const link = document.createElement('a');
      link.href = file.url;
      link.download = file.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      message.success(`${file.name} 다운로드가 시작되었습니다.`);
    } catch (error) {
      console.error('파일 다운로드 중 오류 발생:', error);
      message.error('파일 다운로드에 실패했습니다.');
    }
  };

  const handleDelete = async (file: AttachmentFile) => {
    try {
      // 실제 API 연결 시 아래 코드 사용
      // await InquiryService.deleteAttachment(inquiryId, file.name);
      
      // 파일 목록에서 삭제
      const updatedFileList = fileList.filter(f => f.name !== file.name);
      setFileList(updatedFileList);
      
      // 부모 컴포넌트에 변경 알림
      if (onChange) {
        onChange(updatedFileList.map(f => ({
          name: f.name,
          url: f.url || '',
          type: f.type || '',
          size: f.size || 0
        })));
      }
      
      message.success(`${file.name} 파일이 삭제되었습니다.`);
    } catch (error) {
      console.error('파일 삭제 중 오류 발생:', error);
      message.error('파일 삭제에 실패했습니다.');
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    fileList: fileList,
    beforeUpload: (file) => {
      // 파일 크기 제한 (10MB)
      if (file.size > 10 * 1024 * 1024) {
        message.error('10MB 이하의 파일만 업로드할 수 있습니다.');
        return Upload.LIST_IGNORE;
      }
      return false; // 수동 업로드 모드
    },
    onChange: ({ fileList: newFileList }) => {
      setFileList(newFileList);
      
      // 부모 컴포넌트에 변경 알림
      if (onChange) {
        const updatedAttachments = newFileList
          .filter(file => file.status !== 'error')
          .map(file => ({
            name: file.name,
            url: file.url || URL.createObjectURL(file.originFileObj as Blob),
            type: file.type || file.originFileObj?.type || '',
            size: file.size || file.originFileObj?.size || 0
          }));
        onChange(updatedAttachments);
      }
    },
    onRemove: (file) => {
      const updatedFileList = fileList.filter(f => f.uid !== file.uid);
      setFileList(updatedFileList);
      
      // 부모 컴포넌트에 변경 알림
      if (onChange) {
        const updatedAttachments = updatedFileList
          .filter(file => file.status !== 'error')
          .map(file => ({
            name: file.name,
            url: file.url || (file.originFileObj ? URL.createObjectURL(file.originFileObj as Blob) : ''),
            type: file.type || file.originFileObj?.type || '',
            size: file.size || file.originFileObj?.size || 0
          }));
        onChange(updatedAttachments);
      }
    }
  };

  return (
    <div>
      <Text strong>첨부 파일</Text>
      
      {!readOnly && (
        <Upload {...uploadProps}>
          <Button icon={<UploadOutlined />} style={{ marginTop: '10px', marginBottom: '16px' }}>
            파일 업로드
          </Button>
        </Upload>
      )}
      
      {attachments.length > 0 && (
        <List
          size="small"
          bordered
          dataSource={attachments}
          renderItem={(file) => (
            <List.Item
              actions={[
                <Button 
                  icon={<DownloadOutlined />} 
                  size="small" 
                  onClick={() => handleDownload(file)}
                  type="link"
                />,
                !readOnly && (
                  <Popconfirm
                    title="파일을 삭제하시겠습니까?"
                    onConfirm={() => handleDelete(file)}
                    okText="삭제"
                    cancelText="취소"
                  >
                    <Button 
                      icon={<DeleteOutlined />} 
                      size="small" 
                      type="text" 
                      danger 
                    />
                  </Popconfirm>
                )
              ].filter(Boolean)}
            >
              <Space>
                {getFileIcon(file.type)}
                <Text>{file.name}</Text>
                <Text type="secondary">({formatFileSize(file.size)})</Text>
              </Space>
            </List.Item>
          )}
        />
      )}
    </div>
  );
};

export default InquiryAttachments;