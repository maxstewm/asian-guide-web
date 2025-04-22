// frontend/src/components/article/ArticleForm.js
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 可能需要跳转
import articleService from '../../services/articleService'; // 获取国家
import axios from 'axios'; // 用于上传图片
import './ArticleForm.css'; // 引入 CSS 文件

// 为每个上传的文件生成唯一 ID
const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// 假设的国家列表 (实际应该从 API 获取)
// const availableCountries = [
//   { id: 1, name: 'Japan', slug: 'japan' },
//   { id: 2, name: 'South Korea', slug: 'south-korea' },
//   { id: 3, name: 'Thailand', slug: 'thailand' },
//   { id: 4, name: 'Vietnam', slug: 'vietnam' },
//   { id: 5, name: 'Singapore', slug: 'singapore' },
//   { id: 6, name: 'Malaysia', slug: 'malaysia' },
// ];

function ArticleForm({ initialData = {}, onSubmit, isSubmitting = false }) {
  // --- 表单字段状态 ---
  const [title, setTitle] = useState(initialData.title || '');
  const [content, setContent] = useState(initialData.content || '');
  const [selectedCountrySlug, setSelectedCountrySlug] = useState(initialData.country_slug || '');
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);

  // --- 图片状态 ---
  // 存储成功上传的图片信息 { id: string, url: string }
  const [uploadedImages, setUploadedImages] = useState(initialData.gallery_image_urls || []);
  // 跟踪正在上传的文件 { id: string, name: string, progress: number, error: string | null }
  const [uploadingFiles, setUploadingFiles] = useState([]);

  const fileInputRef = useRef(null);

  // --- 获取国家列表 ---
  useEffect(() => {
    setLoadingCountries(true);
    articleService.getCountries()
      .then(data => setCountries(data || []))
      .catch(err => console.error("Failed to load countries", err))
      .finally(() => setLoadingCountries(false));
  }, []);

  // --- 处理多图片选择 ---
  const handleImageChange = (event) => {
    const files = Array.from(event.target.files); // 获取 FileList 并转为数组
    if (files.length > 0) {
        // 为每个文件创建一个上传任务
        const newUploadTasks = files.map(file => ({
            id: generateFileId(),
            name: file.name,
            progress: 0,
            error: null,
            fileObject: file // 保存文件对象用于上传
        }));
        setUploadingFiles(prev => [...prev, ...newUploadTasks]); // 添加到上传队列

        // 依次触发上传
        newUploadTasks.forEach(task => handleImageUpload(task.id, task.fileObject));
    }
    // 清空文件输入框的值，允许用户再次选择相同的文件
    if (fileInputRef.current) {
        fileInputRef.current.value = "";
    }
  };

  // --- 处理图片上传 ---
  const handleImageUpload = async (fileId, fileToUpload) => {
    if (!fileToUpload) {
      console.log("No file provided for upload.");
      return;
    }

    const formData = new FormData();
    formData.append('imageFile', fileToUpload);
    // 更新特定文件的上传状态为进行中
    setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 0, error: null } : f));

    try {
      // 1. 获取认证 Token (假设存储在 localStorage)
      const token = localStorage.getItem('authToken');
      if (!token) {
        // 可以选择抛出错误或提示用户登录
        throw new Error("Authentication token not found. Please log in.");
      }
      // 2. 获取后端 API 基础 URL (从环境变量或默认值)
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      const uploadUrl = `${apiBaseUrl}/upload/image`; // 拼接上传端点

      console.log(`Uploading image to: ${uploadUrl}`); // 调试日志

      // 3. 使用 Axios 发送 POST 请求
      const response = await axios.post(uploadUrl, formData, {
        headers: {
          // Content-Type 会由浏览器根据 FormData 自动设置，通常不需要手动设置
          // 'Content-Type': 'multipart/form-data', // 通常不需要
          'Authorization': `Bearer ${token}` // 必须携带 Token 进行认证
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          // 更新特定文件的进度
          setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: percentCompleted } : f));
           console.log(`Upload Progress: ${percentCompleted}%`);
         }
      
      });

      // 4. 处理后端响应
      if (response.data && response.data.imageUrl) {
        // 上传成功：添加到 uploadedImages 数组，并从 uploadingFiles 中移除
        setUploadedImages(prev => [...prev, { id: fileId, url: response.data.imageUrl }]);
        setUploadingFiles(prev => prev.filter(f => f.id !== fileId)); // 移除完成的任务
        console.log(`Image ${fileToUpload.name} uploaded: ${response.data.imageUrl}`);
        
      } else {
         // 如果响应中没有 imageUrl
         console.error("Upload response missing imageUrl:", response.data);
         throw new Error("Image URL not found in the server response.");
      }

    } catch (error) {
      console.error(`Image upload failed for ${fileToUpload.name}:`, error.response ? error.response.data : error.message);
      const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
      // 更新特定文件的错误状态
      setUploadingFiles(prev => prev.map(f => f.id === fileId ? { ...f, progress: 0, error: errorMessage } : f));
    } 
  };

  // --- 移除已上传或上传失败的图片 ---
  const handleRemoveImage = (idToRemove) => {
    // 从已上传列表中移除
    setUploadedImages(prev => prev.filter(img => img.id !== idToRemove));
    // 从正在上传/失败列表中移除
    setUploadingFiles(prev => prev.filter(f => f.id !== idToRemove));
    // TODO: 如果需要，调用后端 API 删除 GCS 上的文件 (需要后端支持)
    console.log("TODO: Implement backend call to delete image from GCS if needed, ID:", idToRemove);
  };



  // --- 触发文件选择 ---
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // --- 表单提交 ---
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!selectedCountrySlug) {
      alert("Please select a country!");
      return;
    }

    // 决定如何处理 uploadedImages
    // 方案A: 只提交一张主图 (用户需要选择或默认第一张)
    // const main_image_url = uploadedImages.length > 0 ? uploadedImages[0].url : null;

    // 方案B: 提交所有图片 URL 数组 (需要后端支持 gallery_image_urls 字段)
    const gallery_image_urls = uploadedImages.map(img => img.url);

    // 方案C: 图片 URL 已嵌入富文本编辑器内容 (如果用富文本)

    // 以方案 B 为例 (假设后端支持 gallery_image_urls)
    // 调用父组件传入的 onSubmit 函数
    onSubmit({
      title,
      content, // 现在的 content 是纯文本 textarea 内容
      country_slug: selectedCountrySlug,
      // main_image_url: main_image_url, // 如果需要主图
      gallery_image_urls: gallery_image_urls // 传递图片 URL 数组
    });
  };

  return (
    <form onSubmit={handleSubmit} className="article-form">
      {/* 1. 图片上传和预览区域 */}
      <div className="form-group form-group-image">
        <label>Images:</label>
        {/* 隐藏的文件输入框 */}
        <input
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          ref={fileInputRef}
          style={{ display: 'none' }}
          multiple // 允许多选
        />
        {/* 上传按钮 */}
        <button type="button" onClick={triggerFileInput} disabled={uploadingFiles.some(f => f.progress > 0 && f.progress < 100)} className="upload-btn">
          Add Images...
        </button>

        {/* 显示正在上传的文件 */}
        {uploadingFiles.length > 0 && (
          <div className="uploading-files-list">
            <h4>Uploading:</h4>
            {uploadingFiles.map(file => (
              <div key={file.id} className="upload-item">
                <span>{file.name}</span>
                {file.error ? (
                  <span className="error-message"> Error: {file.error}</span>
                ) : (
                  <progress value={file.progress} max="100" style={{ marginLeft: '10px', width: '100px' }} />
                )}
                <button type="button" onClick={() => handleRemoveImage(file.id)} className="remove-btn-small">×</button>
              </div>
            ))}
          </div>
        )}

        {/* 显示已上传的图片预览 */}
        {uploadedImages.length > 0 && (
            <div className="uploaded-images-grid">
            <h4>Uploaded Images:</h4>
            {uploadedImages.map((image) => (
                <div key={image.id} className="image-preview-item">
                <img src={image.url} alt="Uploaded preview" className="image-preview-thumb" />
                <button type="button" onClick={() => handleRemoveImage(image.id)} className="remove-btn">×</button>
                </div>
            ))}
            </div>
        )}
      </div>

      {/* 2. 标题输入框 (不变) */}
      <div className="form-group">
        <label htmlFor="title">Title:</label>
        <input /* ... */ />
      </div>

      {/* 3. 正文输入框 (Textarea) (不变) */}
      <div className="form-group">
        <label htmlFor="content">Content:</label>
        <textarea /* ... */ />
      </div>

      {/* 4. 地点选择 (单选按钮) (不变) */}
      <div className="form-group form-group-countries">
        <label>Country:</label>
        {/* ... 国家单选按钮 ... */}
      </div>

      {/* 5. 提交按钮 */}
      <button type="submit" disabled={isSubmitting || uploadingFiles.some(f => f.progress > 0 && f.progress < 100)} className="submit-btn">
        {isSubmitting ? 'Publishing...' : (initialData.id ? 'Update Guide' : 'Publish Guide')}
      </button>
    </form>
  );
}

export default ArticleForm;