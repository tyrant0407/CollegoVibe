// Toast Notification System
class ToastManager {
    constructor() {
        this.container = null;
        this.init();
    }

    init() {
        // Ensure document.body is available
        if (!document.body) {
            console.warn('Toast: document.body not available yet');
            return;
        }

        // Create toast container if it doesn't exist
        if (!document.getElementById('toast-container')) {
            this.container = document.createElement('div');
            this.container.id = 'toast-container';
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        } else {
            this.container = document.getElementById('toast-container');
        }
    }

    show(message, type = 'info', duration = 2000) {
        // Ensure container is initialized
        if (!this.container) {
            this.init();
        }

        // If still no container, log error and return
        if (!this.container) {
            console.error('Toast: Unable to create container. DOM may not be ready.');
            return null;
        }

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        // Toast content with improved close button
        toast.innerHTML = `
      <div class="toast-content">
        <div class="toast-icon">
          ${this.getIcon(type)}
        </div>
        <div class="toast-message">${message}</div>
        <button class="toast-close" onclick="window.toast.remove(this.parentElement.parentElement)">
          <i class="ri-close-line"></i>
        </button>
      </div>
      <div class="toast-progress"></div>
    `;

        // Add to container
        this.container.appendChild(toast);

        // Animate in with slight delay for smoother effect
        requestAnimationFrame(() => {
            setTimeout(() => {
                toast.classList.add('toast-show');
            }, 50);
        });

        // Auto remove with progress bar
        const progressBar = toast.querySelector('.toast-progress');
        if (progressBar && duration > 0) {
            progressBar.style.animationDuration = `${duration}ms`;

            setTimeout(() => {
                this.remove(toast);
            }, duration);
        }

        // Add hover pause functionality
        let timeoutId;
        const startRemovalTimer = () => {
            timeoutId = setTimeout(() => {
                this.remove(toast);
            }, duration);
        };

        const pauseRemovalTimer = () => {
            clearTimeout(timeoutId);
            progressBar.style.animationPlayState = 'paused';
        };

        const resumeRemovalTimer = () => {
            progressBar.style.animationPlayState = 'running';
            const remainingTime = duration * (1 - (progressBar.offsetWidth / progressBar.parentElement.offsetWidth));
            timeoutId = setTimeout(() => {
                this.remove(toast);
            }, remainingTime);
        };

        // Add event listeners for hover pause
        toast.addEventListener('mouseenter', pauseRemovalTimer);
        toast.addEventListener('mouseleave', resumeRemovalTimer);

        return toast;
    }

    remove(toast) {
        if (toast && toast.parentElement) {
            // Remove event listeners to prevent memory leaks
            toast.removeEventListener('mouseenter', () => { });
            toast.removeEventListener('mouseleave', () => { });

            toast.classList.add('toast-hide');
            setTimeout(() => {
                if (toast.parentElement) {
                    toast.parentElement.removeChild(toast);
                }
            }, 400); // Slightly longer for smoother animation
        }
    }

    getIcon(type) {
        const icons = {
            success: '<i class="ri-check-circle-fill"></i>',
            error: '<i class="ri-error-warning-fill"></i>',
            warning: '<i class="ri-alert-fill"></i>',
            info: '<i class="ri-information-fill"></i>'
        };
        return icons[type] || icons.info;
    }

    // Convenience methods with 2-second default
    success(message, duration = 2000) {
        return this.show(message, 'success', duration);
    }

    error(message, duration = 3000) {
        return this.show(message, 'error', duration); // Slightly longer for errors
    }

    warning(message, duration = 2500) {
        return this.show(message, 'warning', duration); // Slightly longer for warnings
    }

    info(message, duration = 2000) {
        return this.show(message, 'info', duration);
    }
}

// Global toast instance - will be initialized when DOM is ready
window.toast = null;

// Helper function for showing toasts from URL parameters
function showToastFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    const message = urlParams.get('message');
    const type = urlParams.get('type') || 'info';

    if (message && window.toast) {
        // Use appropriate duration based on type
        const duration = type === 'error' ? 3000 : type === 'warning' ? 2500 : 2000;
        window.toast.show(decodeURIComponent(message), type, duration);

        // Clean URL without refreshing page
        const url = new URL(window.location);
        url.searchParams.delete('message');
        url.searchParams.delete('type');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }
}

// Initialize toast system when DOM is ready
function initializeToast() {
    if (!window.toast) {
        window.toast = new ToastManager();
    }
    showToastFromUrl();
}

// Fallback toast function for cases where ToastManager fails
window.showToast = function (message, type = 'info') {
    if (window.toast && typeof window.toast.show === 'function') {
        return window.toast.show(message, type);
    } else {
        // Fallback to console log or alert
        console.log(`Toast (${type}): ${message}`);
        return null;
    }
};

// Auto-initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeToast);
} else {
    // DOM is already loaded
    initializeToast();
}