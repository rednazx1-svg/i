// ClientFlow Onboarder - Main JavaScript

class ClientSetupForm {
    constructor() {
        this.form = document.getElementById('clientForm');
        this.smsSection = document.getElementById('smsSection');
        this.phoneInput = document.getElementById('phone');
        this.submitBtn = document.getElementById('submitBtn');
        this.messageContainer = document.getElementById('messageContainer');
        
        this.init();
    }

    init() {
        // Event Listeners
        this.form.addEventListener('submit', this.handleSubmit.bind(this));
        this.phoneInput.addEventListener('input', this.handlePhoneInput.bind(this));
        
        // SMS toggle change
        this.form.querySelectorAll('input[name="sms"]').forEach(radio => {
            radio.addEventListener('change', () => {
                // No debug preview needed
            });
        });
    }
    handlePhoneInput(e) {
        const phone = e.target.value.trim();
        if (phone.length >= 6) {
            this.smsSection.classList.remove('hidden');
            setTimeout(() => this.smsSection.classList.add('fade-in'), 10);
        } else {
            this.smsSection.classList.add('hidden');
            this.smsSection.classList.remove('fade-in');
        }
    }
generateClientId(businessName) {
        return businessName
            .toLowerCase()
            .replace(/[^\w\s]/g, '')  // Remove punctuation
            .replace(/\s+/g, '_')     // Replace spaces with underscores
            .trim();
    }
    getFormData() {
        const businessName = document.getElementById('business_name').value.trim();
        const clientId = this.generateClientId(businessName);
        
        // Get SMS value - default to "FALSE" if section is hidden
        let sendSms = "FALSE";
        if (!this.smsSection.classList.contains('hidden')) {
            const smsRadio = this.form.querySelector('input[name="sms"]:checked');
            sendSms = smsRadio ? smsRadio.value : "FALSE";
        }

        // Get lead handling method
        const leadHandlingRadio = this.form.querySelector('input[name="lead_handling_method"]:checked');
        const leadHandlingMethod = leadHandlingRadio ? leadHandlingRadio.value : '';

        return {
            client_id: clientId,
            business_name: businessName,
            email: document.getElementById('email').value.trim(),
            phone: document.getElementById('phone').value.trim() || '',
            send_sms: sendSms,
            booking_link: document.getElementById('booking_link').value.trim() || '',
            service_type: document.getElementById('service_type').value,
            service_area: document.getElementById('service_area').value.trim(),
            lead_handling_method: leadHandlingMethod,
            source: 'client_onboarding',
            page_url: window.location.href,
            timestamp: new Date().toISOString()
        };
    }
    validateForm(data) {
        if (!data.business_name) {
            this.showMessage('Please enter a business name', 'error');
            return false;
        }
        
        if (!data.email) {
            this.showMessage('Please enter a valid email address', 'error');
            return false;
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
            this.showMessage('Please enter a valid email address', 'error');
            return false;
        }

        // New required fields validation
        if (!data.service_type) {
            this.showMessage('Please select a service type', 'error');
            return false;
        }

        if (!data.service_area) {
            this.showMessage('Please enter your service area', 'error');
            return false;
        }

        if (!data.lead_handling_method) {
            this.showMessage('Please select how we should handle your leads', 'error');
            return false;
        }
        
        return true;
    }
async handleSubmit(e) {
        e.preventDefault();
        
        const formData = this.getFormData();
        
        if (!this.validateForm(formData)) {
            return;
        }

        // Disable submit button and show loading state
        this.setLoadingState(true);
        this.showMessage('', 'clear');

        try {
            // Try with application/json first
            const success = await this.sendToWebhook(formData, 'application/json');
            
            if (!success) {
                // Retry with x-www-form-urlencoded
                await this.sendToWebhook(formData, 'application/x-www-form-urlencoded');
            }
            
        } catch (error) {
            console.error('Submission error:', error);
            this.showMessage('Couldn\'t submit. Please try again.', 'error');
        } finally {
            this.setLoadingState(false);
        }
    }

    async sendToWebhook(data, contentType) {
        const webhookUrl = 'https://hook.us2.make.com/o4usttjoooyfl7asj32u94tdgkxsuvay';
        
        let body;
        let headers;
        
        if (contentType === 'application/json') {
            body = JSON.stringify(data, null, 2);
            headers = {
                'Content-Type': 'application/json'
            };
        } else {
            body = new URLSearchParams();
            Object.entries(data).forEach(([key, value]) => {
                body.append(key, value);
            });
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
        }

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: headers,
                body: contentType === 'application/json' ? body : body.toString()
            });
            if (response.ok) {
                this.showMessage('Setup complete. We’ll take it from here.', 'success');
                
                // Reset form after successful submission
                setTimeout(() => {
                    this.form.reset();
                    this.smsSection.classList.add('hidden');
                    this.showMessage('', 'clear');
                }, 3000);
                
                return true;
            } else {
                throw new Error(`HTTP ${response.status}`);
            }
} catch (error) {
            if (contentType === 'application/json') {
                console.log('JSON submission failed, will retry with form data');
                return false;
            } else {
                throw error;
            }
        }
    }
setLoadingState(isLoading) {
        if (isLoading) {
            this.submitBtn.disabled = true;
            this.submitBtn.innerHTML = `
                <span class="flex items-center justify-center gap-2">
                    <i data-feather="loader" class="w-5 h-5 animate-spin"></i>
                    Submitting...
                </span>
            `;
            this.submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
            feather.replace();
        } else {
            this.submitBtn.disabled = false;
            this.submitBtn.innerHTML = `
                <span class="flex items-center justify-center gap-2">
                    <i data-feather="send" class="w-5 h-5"></i>
                    Complete Setup
                </span>
            `;
            this.submitBtn.classList.remove('opacity-75', 'cursor-not-allowed');
            feather.replace();
        }
    }

    showMessage(message, type) {
        this.messageContainer.innerHTML = '';
        
        if (!message || type === 'clear') return;
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `p-4 rounded-lg ${type === 'success' ? 'success-message' : 'error-message'}`;
        
        const icon = type === 'success' ? 'check-circle' : 'alert-circle';
        
        messageDiv.innerHTML = `
            <div class="flex items-start gap-3">
                <i data-feather="${icon}" class="w-5 h-5 ${type === 'success' ? 'text-green-600' : 'text-red-600'}"></i>
                <div>
                    <p class="font-medium ${type === 'success' ? 'text-green-800' : 'text-red-800'}">
                        ${message}
                    </p>
                </div>
            </div>
        `;
        
        this.messageContainer.appendChild(messageDiv);
        feather.replace();
        
        // Auto-remove error messages after 5 seconds
        if (type === 'error') {
            setTimeout(() => {
                if (this.messageContainer.contains(messageDiv)) {
                    this.messageContainer.removeChild(messageDiv);
                }
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ClientSetupForm();
});