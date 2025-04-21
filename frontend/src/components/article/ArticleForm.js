// frontend/src/components/article/ArticleForm.js
import React, { useState, useRef, useMemo, useEffect } from 'react'; // 添加 useEffect
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import axios from 'axios';
import articleService from '../../services/articleService'; // 引入 service 获取国家

// 接收 initialData 用于编辑，接收 onSubmit 用于提交处理
function ArticleForm({ initialData = {}, onSubmit, isSubmitting = false }) {
  const [title, setTitle] = useState(initialData.title || '');
  const [content, setContent] = useState(initialData.content || '');
  const [countrySlug, setCountrySlug] = useState(initialData.country_slug || ''); // 使用 slug
  const [coverImageUrl, setCoverImageUrl] = useState(initialData.cover_image_url || '');
  const [countries, setCountries] = useState([]); // 存储国家列表
  const [loadingCountries, setLoadingCountries] = useState(true);

  const quillRef = useRef(null);

  // --- 获取国家列表 ---
  useEffect(() => {
    setLoadingCountries(true);
    articleService.getCountries()
      .then(data => {
        setCountries(data || []);
        // 如果是编辑且有初始国家，确保它是有效的
        if (initialData.country_slug && !data.some(c => c.slug === initialData.country_slug)) {
            console.warn("Initial country slug not found in fetched countries list.");
            // 可以选择清空或保留，这里暂时保留
        }
      })
      .catch(err => {
        console.error("Failed to load countries", err);
        // 可以设置错误状态
      })
      .finally(() => {
        setLoadingCountries(false);
      });
  }, [initialData.country_slug]); // 依赖 initialData 中的 slug，确保编辑时能正确选中

  const handleContentChange = (value) => {
    setContent(value);
  };

  // --- 图片上传处理 (和之前示例一样) ---
  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();

    input.onchange = async () => {
      const file = input.files[0];
      if (file) {
        const formData = new FormData();
        formData.append('imageFile', file);
        try {
          const token = localStorage.getItem('authToken');
          if (!token) { /* ... 提示登录 ... */ return; }
          const apiBaseUrl = process.env.REACT_APP_API_BASE_URL || '/api';
          const response = await axios.post(`${apiBaseUrl}/upload/image`, formData, { /* ... headers ... */ });
          if (response.data && response.data.imageUrl) {
            const quill = quillRef.current.getEditor();
            const range = quill.getSelection(true);
            quill.insertEmbed(range.index, 'image', response.data.imageUrl);
            quill.setSelection(range.index + 1);
          }
        } catch (error) { /* ... 错误处理 ... */ }
      }
    };
  };

  const modules = useMemo(() => ({ /* ... 和之前示例一样，包含 image handler ... */
       toolbar: {
         container: [ /* ... 工具栏配置 ... */ ['link', 'image'] ],
         handlers: { image: imageHandler }
       }
   }), []);

  const formats = [ /* ... 之前的 formats ... */ 'image' ];

  // --- 表单提交处理 ---
  const handleSubmit = (event) => {
    event.preventDefault();
    if (!countrySlug) {
        alert("Please select a country!"); // 基本验证
        return;
    }
    // 调用父组件传入的 onSubmit 函数，并传递表单数据
    onSubmit({
      title,
      content,
      country_slug: countrySlug, // 传递 slug
      cover_image_url: coverImageUrl
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* 标题 */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="title" style={{ display: 'block', marginBottom: '5px' }}>Title:</label>
        <input
          type="text"
          id="title"
          value={title}
          onChange={e => setTitle(e.target.value)}
          required
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      {/* 国家选择 */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="country" style={{ display: 'block', marginBottom: '5px' }}>Country:</label>
        <select
          id="country"
          value={countrySlug}
          onChange={e => setCountrySlug(e.target.value)}
          required
          disabled={loadingCountries}
          style={{ width: '100%', padding: '8px' }}
        >
          <option value="" disabled>
            {loadingCountries ? 'Loading countries...' : '-- Select a Country --'}
          </option>
          {countries.map(country => (
            <option key={country.id} value={country.slug}>
              {country.name}
            </option>
          ))}
        </select>
      </div>

      {/* 封面图片 URL */}
      <div style={{ marginBottom: '15px' }}>
        <label htmlFor="coverImage" style={{ display: 'block', marginBottom: '5px' }}>Cover Image URL (Optional):</label>
        <input
          type="url"
          id="coverImage"
          value={coverImageUrl}
          onChange={e => setCoverImageUrl(e.target.value)}
          placeholder="https://example.com/image.jpg"
          style={{ width: '100%', padding: '8px' }}
        />
      </div>

      {/* 内容编辑器 */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'block', marginBottom: '5px' }}>Content:</label>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          value={content}
          onChange={handleContentChange}
          modules={modules}
          formats={formats}
          placeholder="Start writing your guide here..."
          style={{ backgroundColor: 'white' }} // 确保背景色正常
        />
      </div>

      {/* 提交按钮 */}
      <button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Publishing...' : (initialData.id ? 'Update Article' : 'Publish Article')}
      </button>
    </form>
  );
}

export default ArticleForm;