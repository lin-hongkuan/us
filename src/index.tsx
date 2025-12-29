import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';  // 导入全局样式文件
import App from './App';  // 导入主应用组件

// 获取根DOM元素，用于挂载React应用
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// 创建React根实例并渲染应用
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>  {/* 严格模式：帮助检测潜在问题 */}
    <App />  {/* 主应用组件 */}
  </React.StrictMode>
);