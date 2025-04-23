// frontend/src/components/article/ArticleForm.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom'; // useParams for edit mode
import axios from 'axios';
import articleService from '../../services/articleService';
//import uploadService from '../../services/uploadService'; // 引入（如果创建了）
import { useAuth } from '../../contexts/AuthContext'; // 获取用户信息
import './ArticleForm.css';

const generateFileId = () => `file_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

// isEditMode 用于区分是新建还是编辑
function ArticleForm({ initialData = {}, isEditMode = false }) {
  const navigate = useNavigate();
  const { slug: articleSlug } = useParams(); // 获取编辑时的 slug
  const { user } = useAuth(); // 获取当前用户

  // --- 文章状态 ---
  const [articleId, setArticleId] = useState(null); // 存储草稿/文章 ID
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCountrySlug, setSelectedCountrySlug] = useState('');
  const [status, setStatus] = useState('draft'); // 文章状态

  // --- 图片状态 ---
  const [uploadedImages, setUploadedImages] = useState([]); // {id: db_id, url: string, order: number}
  const [uploadingFiles, setUploadingFiles] = useState([]); // {id: temp_id, name: string, progress: number, error: string|null}

  // --- 其他状态 ---
  const [countries, setCountries] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(true);
  const [loadingArticle, setLoadingArticle] = useState(isEditMode); // 编辑模式下初始加载文章
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  const fileInputRef = useRef(null);
  const isMounted = useRef(true); // 用于防止组件卸载后更新状态

  const [selectedType, setSelectedType] = useState(initialData.type || 'travel'); // <-- 添加 type 状态，默认 'travel'

  // --- 初始化 Effect ---
  useEffect(() => {
      isMounted.current = true;
      // 获取国家列表
      setLoadingCountries(true);
      articleService.getCountries()
          .then(data => {
              if (isMounted.current) setCountries(data || []);
          })
          .catch(err => console.error("Failed to load countries", err))
          .finally(() => {
              if (isMounted.current) setLoadingCountries(false);
          });

      // 根据模式初始化文章
      if (isEditMode && articleSlug) {
          // --- 编辑模式：加载现有文章数据 ---
          setLoadingArticle(true);
          articleService.getArticleBySlug(articleSlug)
              .then(data => {
                  if (isMounted.current) {
                      // 检查权限
                      if (user && data.author_id !== user.id) {
                           setFormError("You don't have permission to edit this guide.");
                           // 可以选择重定向或禁用表单
                           return;
                      }
                      setArticleId(data.id);
                      setTitle(data.title || '');
                      setContent(data.content || '');
                      setSelectedCountrySlug(data.country_slug || '');
                      setStatus(data.status || 'draft');
                      // 后端返回的 images 数组包含 id, image_url, upload_order
                      setUploadedImages(data.images || []);
                      setSelectedType(data.type || 'travel'); 
                  }
              })
              .catch(err => {
                  if (isMounted.current) setFormError("Failed to load article data.");
                  console.error(err);
              })
              .finally(() => {
                   if (isMounted.current) setLoadingArticle(false);
              });
      } else {
          // --- 创建模式：创建草稿 ---

          if (!isEditMode && !articleId) {
            console.log("useEffect: Create mode - creating draft...");


          setLoadingArticle(true); // 开始加载（创建草稿）
          articleService.createDraftArticle() // 调用新的 service 方法
              .then(data => {
                  if (isMounted.current) {
                      if (data && data.articleId) {
                          setArticleId(data.articleId); // 保存草稿 ID
                          console.log("Draft created with ID:", data.articleId);
                      } else {
                           setFormError("Failed to create a draft. Please try again.");
                      }
                  }
              })
              .catch(err => {
                  if (isMounted.current) setFormError("Failed to create a draft. Please try again.");
                  console.error(err);
              })
              .finally(() => {
                  if (isMounted.current) setLoadingArticle(false);
              });
            } else if (!isEditMode && articleId) {
                console.log("useEffect: Create mode - draft already created (ID: " + articleId + "). Skipping creation.");
                setLoadingArticle(false); // 确保加载结束
          } else {
              // Line 31: 处理其他情况或结束加载
              setLoadingArticle(false);
          }
      }

      // 清理函数
      return () => { isMounted.current = false; };
  }, [isEditMode, articleSlug, articleId, user]); // 添加 user 作为依赖

  // --- 图片上传处理 (基于 articleId) ---
  const handleImageChange = (event) => {
    if (!articleId) {
        alert("Draft is not ready yet. Please wait.");
        return;
    }
    const files = Array.from(event.target.files);
    if (files.length > 0) {
        const newUploadTasks = files.map(file => ({
            id: generateFileId(), // 临时前端 ID
            name: file.name,
            progress: 0,
            error: null,
            fileObject: file
        }));
        setUploadingFiles(prev => [...prev, ...newUploadTasks]);
        newUploadTasks.forEach(task => handleImageUpload(task.id, task.fileObject));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImageUpload = useCallback(async (tempFileId, fileToUpload) => {
    if (!articleId) {
        console.error("Cannot upload image: articleId is not set.");
        // 更新对应任务的错误状态
         setUploadingFiles(prev => prev.map(f => f.id === tempFileId ? { ...f, progress: 0, error: "Draft not ready" } : f));
        return;
    }

    setUploadingFiles(prev => prev.map(f => f.id === tempFileId ? { ...f, progress: 0, error: null } : f));
    const formData = new FormData();
    formData.append('imageFile', fileToUpload);

    try {
      const token = localStorage.getItem('authToken');
      if (!token) throw new Error("Authentication token not found.");
      const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
      // 将 articleId 添加到 URL
      const uploadUrl = `${apiBaseUrl}/upload/image/${articleId}`;

      const response = await axios.post(uploadUrl, formData, {
        headers: { 'Authorization': `Bearer ${token}` },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (isMounted.current) {
              setUploadingFiles(prev => prev.map(f => f.id === tempFileId ? { ...f, progress: percentCompleted } : f));
          }
        }
      });

      if (response.data && response.data.image) { // 后端现在返回 { image: { id, image_url } }
         if (isMounted.current) {
             // 使用后端返回的数据库 ID 和 URL 更新状态
             setUploadedImages(prev => [...prev, { id: response.data.image.id, url: response.data.image.image_url, order: prev.length }]); // 假设 order 基于当前数量
             setUploadingFiles(prev => prev.filter(f => f.id !== tempFileId));
         }
      } else {
        throw new Error("Image data not found in response");
      }
    } catch (error) {
      if (isMounted.current) {
          console.error(`Image upload failed for ${fileToUpload.name}:`, error.response ? error.response.data : error.message);
          const errorMessage = error.response?.data?.message || error.message || 'Upload failed';
          setUploadingFiles(prev => prev.map(f => f.id === tempFileId ? { ...f, progress: 0, error: errorMessage } : f));
      }
    }
  }, [articleId]); // 依赖 articleId

  // --- 移除图片处理 ---
  const handleRemoveImage = async (imageIdToRemove) => {
      // 先从前端状态移除，提供即时反馈
      const imageToRemove = uploadedImages.find(img => img.id === imageIdToRemove);
      setUploadedImages(prev => prev.filter(img => img.id !== imageIdToRemove));
      setUploadingFiles(prev => prev.filter(f => f.id !== imageIdToRemove)); // 也从上传/失败列表移除

      if (imageToRemove) { // 只删除已成功上传到数据库的图片
          try {
              // 调用后端删除 API
              await articleService.deleteUploadedImage(imageIdToRemove); // 需要在 service 中添加此方法
              console.log(`Image ${imageIdToRemove} deleted from server.`);
          } catch (error) {
              console.error(`Failed to delete image ${imageIdToRemove} from server:`, error);
              // 删除失败，可以选择把图片加回到状态，或者提示用户
              alert("Failed to delete image from server. Please try again.");
              // 把图片加回去 (如果需要)
              // setUploadedImages(prev => [...prev, imageToRemove].sort((a, b) => a.order - b.order));
          }
      }
  };


  const triggerFileInput = () => fileInputRef.current?.click();

  // --- 处理保存草稿 ---
  const handleSaveDraft = async () => {
      if (!articleId) {
          setFormError("Cannot save draft, draft ID is missing.");
          return;
      }
      setIsSubmitting(true);
      setFormError(null);
      try {
          const articleData = { title, content, country_slug: selectedCountrySlug, type: selectedType, status: 'draft' };
          await articleService.updateArticle(articleId, articleData); // service 需要 updateArticle 方法
          alert("Draft saved successfully!");
      } catch (error) {
          setFormError("Failed to save draft. Please try again.");
          console.error("Save draft error:", error);
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- 处理发布文章 ---
  const handlePublish = async () => {
      if (!articleId) {
          setFormError("Cannot publish, draft ID is missing.");
          return;
      }
       if (!selectedCountrySlug) {
           setFormError("Please select a country before publishing.");
           return;
       }
       if (!title) {
            setFormError("Please enter a title before publishing.");
            return;
       }
       // 可以添加其他发布前的验证，例如至少有一张图片等

      setIsSubmitting(true);
      setFormError(null);
      try {
          const articleData = { title, content, country_slug: selectedCountrySlug, type: selectedType, status: 'published' };
          const result = await articleService.updateArticle(articleId, articleData); // service 需要 updateArticle 方法
          alert("Guide published successfully!");
          // 跳转到发布的文章详情页 (需要 slug)
          navigate(`/articles/${result.slug || articleSlug}`); // 优先用返回的 slug
      } catch (error) {
          setFormError(error.message || "Failed to publish guide. Please try again.");
          console.error("Publish error:", error);
          setIsSubmitting(false);
      }
      // setIsSubmitting(false); // 成功后跳转，失败时设置
  };


  // --- 渲染 ---
  if (loadingArticle) return <div>Loading Editor...</div>;
  if (formError && !articleId) return <div style={{color: 'red'}}>Error: {formError}</div>; // 如果草稿创建失败则显示错误

  return (
    // 包裹在一个容器里，方便处理错误显示等
    <div className="article-form-container">
        {formError && <p className="error-message" style={{textAlign: 'center', marginBottom: '15px'}}>{formError}</p>}

        <form className="article-form"> {/* 移除 form 的 onSubmit */}
            {/* 1. 图片上传和预览区域 */}
            <div className="form-group form-group-image">
                <label>Images ({uploadedImages.length} uploaded):</label>
                <input type="file" accept="image/*" onChange={handleImageChange} ref={fileInputRef} style={{ display: 'none' }} multiple />
                <button type="button" onClick={triggerFileInput} disabled={uploadingFiles.some(f => f.progress >= 0 && f.progress < 100) || !articleId} className="upload-btn">
                Add Images...
                </button>

                {/* 正在上传 */}
                {uploadingFiles.filter(f=>f.progress >= 0 && f.progress < 100).length > 0 && (
                    <div className="uploading-files-list">
                        <h4>Uploading:</h4>
                        {uploadingFiles.filter(f=>f.progress >= 0 && f.progress < 100).map(file => (
                        <div key={file.id} className="upload-item">
                            <span>{file.name} ({file.progress}%)</span>
                            <progress value={file.progress} max="100" style={{ marginLeft: '10px', width: '100px' }} />
                        </div>
                        ))}
                    </div>
                )}
                {/* 上传失败 */}
                 {uploadingFiles.filter(f=>f.error).length > 0 && (
                    <div className="uploading-files-list">
                        <h4>Failed:</h4>
                        {uploadingFiles.filter(f=>f.error).map(file => (
                        <div key={file.id} className="upload-item">
                            <span>{file.name}</span>
                            <span className="error-message"> Error: {file.error}</span>
                            <button type="button" onClick={() => handleRemoveImage(file.id)} className="remove-btn-small">×</button>
                        </div>
                        ))}
                    </div>
                )}


                {/* 已上传图片网格 */}
                {uploadedImages.length > 0 && (
                    <div className="uploaded-images-grid">
                    <h4>Uploaded Images:</h4>
                    {/* 按 order 排序显示，如果没有 order，按当前数组顺序 */}
                    {uploadedImages.sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity)).map((image) => (
                        <div key={image.id} className="image-preview-item">
                        <img src={image.url} alt="Uploaded preview" className="image-preview-thumb" />
                        <button type="button" onClick={() => handleRemoveImage(image.id)} className="remove-btn">×</button>
                        </div>
                    ))}
                    </div>
                )}
            </div>

            {/* 2. 标题 */}
            <div className="form-group">
                <label htmlFor="title">Title:</label>
                <input type="text" id="title" value={title} onChange={e => setTitle(e.target.value)} required disabled={isSubmitting || !articleId} />
            </div>

            {/* 3. 正文 */}
            <div className="form-group">
                <label htmlFor="content">Content:</label>
                <textarea id="content" value={content} onChange={e => setContent(e.target.value)} rows={10} disabled={isSubmitting || !articleId} />
            </div>

            {/* --- 新增：类型选择 (单选按钮) --- */}
        <div className="form-group form-group-type">
          <label>Type:</label>
          <div className="type-radio-group">
            <label className="type-radio-label">
              <input
                type="radio"
                name="articleType"
                value="travel"
                checked={selectedType === 'travel'}
                onChange={e => setSelectedType(e.target.value)}
                disabled={isSubmitting || !articleId}
              />
              Travel
            </label>
            <label className="type-radio-label">
              <input
                type="radio"
                name="articleType"
                value="food"
                checked={selectedType === 'food'}
                onChange={e => setSelectedType(e.target.value)}
                disabled={isSubmitting || !articleId}
              />
              Food
            </label>
          </div>
        </div>

        {/* 4. 国家选择 (修改国家名称显示) */}
        <div className="form-group form-group-countries">
          <label>Country:</label>
          {loadingCountries ? (<p>Loading countries...</p>) : countries.length === 0 ? (<p>Could not load countries.</p>) : (
              <div className="country-radio-group">
                  {countries.map(country => (
                  <label key={country.id} className="country-radio-label">
                      <input
                      type="radio" name="country" value={country.slug}
                      checked={selectedCountrySlug === country.slug}
                      onChange={e => setSelectedCountrySlug(e.target.value)}
                      required disabled={isSubmitting || !articleId}
                      />
                      {/* 直接显示 country.name，假设它已经是英文 */}
                      {country.name}
                      {/* 如果需要翻译，你需要一个翻译机制 */}
                      {/* {getCountryDisplayName(country.name)} */}
                  </label>
                  ))}
              </div>
          )}
        </div>

            {/* 5. 操作按钮区域 */}
            <div className="form-actions">
                <button type="button" onClick={handleSaveDraft} disabled={isSubmitting || !articleId || uploadingFiles.some(f => f.progress >= 0 && f.progress < 100)} className="save-draft-btn action-btn">
                    {isSubmitting && status !== 'published' ? 'Saving...' : 'Save Draft'}Save Draft
                </button>
                <button type="button" onClick={handlePublish} disabled={isSubmitting || !articleId || uploadingFiles.some(f => f.progress >= 0 && f.progress < 100)} className="publish-btn action-btn">
                    {isSubmitting && status === 'published' ? 'Publishing...' : 'Publish Guide'}{isEditMode ? 'Update & Publish' : 'Publish Guide'}
                </button>
            </div>
        </form>
    </div>
  );
}

export default ArticleForm;