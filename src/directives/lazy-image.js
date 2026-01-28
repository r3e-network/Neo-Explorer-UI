/**
 * v-lazy-image directive
 * 使用 IntersectionObserver 实现图片懒加载
 */

const defaultOptions = {
  root: null,
  rootMargin: '50px',
  threshold: 0.1
};

const loadImage = (el, binding) => {
  const src = binding.value;
  if (!src) return;
  
  el.src = src;
  el.classList.remove('lazy-loading');
  el.classList.add('lazy-loaded');
};

const createObserver = (el, binding) => {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        loadImage(el, binding);
        observer.unobserve(el);
      }
    });
  }, defaultOptions);
  
  observer.observe(el);
  el._lazyObserver = observer;
};

export default {
  mounted(el, binding) {
    // 添加占位样式
    el.classList.add('lazy-loading');
    
    // 设置占位图
    el.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1 1"%3E%3C/svg%3E';
    
    if ('IntersectionObserver' in window) {
      createObserver(el, binding);
    } else {
      // 降级处理
      loadImage(el, binding);
    }
  },
  
  updated(el, binding) {
    if (binding.value !== binding.oldValue) {
      if (el._lazyObserver) {
        el._lazyObserver.unobserve(el);
      }
      createObserver(el, binding);
    }
  },
  
  unmounted(el) {
    if (el._lazyObserver) {
      el._lazyObserver.disconnect();
      delete el._lazyObserver;
    }
  }
};
