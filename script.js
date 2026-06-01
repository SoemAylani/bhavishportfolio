// Theme Toggle Functionality
const themeToggle = document.getElementById('themeToggle');
const themeIcon = document.getElementById('themeIcon');
const body = document.body;

// Check for saved theme preference or default to dark mode (dark blue design)
const currentTheme = localStorage.getItem('theme') || 'dark';
body.setAttribute('data-theme', currentTheme);
updateThemeIcon(currentTheme);

themeToggle.addEventListener('click', () => {
    const currentTheme = body.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    
    body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
});

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
}

// Navbar Scroll Highlight
const navbar = document.querySelector('.navbar');
const navLinks = document.querySelectorAll('.nav-link');
const sections = document.querySelectorAll('section');

function highlightNav() {
    let current = '';
    
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= (sectionTop - 200)) {
            current = section.getAttribute('id');
        }
    });

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${current}`) {
            link.classList.add('active');
        }
    });
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
    highlightNav();
});

// Smooth Scrolling for Navigation Links
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetId = link.getAttribute('href');
        const targetSection = document.querySelector(targetId);
        
        if (targetSection) {
            const offsetTop = targetSection.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
        
        // Close mobile menu if open
        navMenu.classList.remove('active');
    });
});

// Mobile Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

hamburger.addEventListener('click', () => {
    navMenu.classList.toggle('active');
    hamburger.classList.toggle('active');
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
        navMenu.classList.remove('active');
        hamburger.classList.remove('active');
    }
});

// Scroll Animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            
            // Animate progress bars
            if (entry.target.classList.contains('skill-card')) {
                const progressFill = entry.target.querySelector('.progress-fill');
                if (progressFill) {
                    const width = progressFill.style.width;
                    progressFill.style.width = '0%';
                    setTimeout(() => {
                        progressFill.style.width = width;
                    }, 200);
                }
            }
        }
    });
}, observerOptions);

// Observe all animated elements
document.querySelectorAll('.fade-in, .slide-in-left, .slide-in-right, .slide-in-up, .skill-card').forEach(el => {
    observer.observe(el);
});

// Initial highlight on page load
highlightNav();

// API URL: when opened from backend (port 3000) use relative path; otherwise same host + port 3000
const API_URL = window.location.protocol === 'file:' ? 'http://localhost:3000/api' : `${window.location.origin}/api`;

// Utility function to show form messages
function showFormMessage(elementId, message, type = 'success') {
    const messageElement = document.getElementById(elementId);
    if (messageElement) {
        messageElement.textContent = message;
        messageElement.className = `form-message ${type}`;
        messageElement.style.display = 'block';
        
        // Auto-hide after 5 seconds
        setTimeout(() => {
            messageElement.style.display = 'none';
        }, 5000);
    }
}

// Utility function to validate email
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Function to submit form data
async function submitForm(formData) {
    try {
        const response = await fetch(`${API_URL}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            const msg = (data.errors && data.errors[0] && data.errors[0].msg)
                ? data.errors[0].msg
                : (data.message || 'Something went wrong');
            throw new Error(msg);
        }

        return data;
    } catch (error) {
        console.error('Error submitting form:', error);
        if (error.name === 'TypeError' || error.message === 'Failed to fetch') {
            throw new Error('Cannot reach server. Open the deployed website URL, or run locally with "npm start" and open http://localhost:3000.');
        }
        throw error;
    }
}

// Contact Form Submission
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const submitBtn = document.getElementById('submitBtn');
        const submitText = document.getElementById('submitText');
        const submitLoader = document.getElementById('submitLoader');
        const formMessage = document.getElementById('formMessage');
        
        // Get form values
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim();
        const message = document.getElementById('message').value.trim();
        const formType = document.getElementById('formType').value;
        
        // Validation
        if (!name || !email || !message) {
            showFormMessage('formMessage', 'Please fill in all fields.', 'error');
            return;
        }
        
        if (!validateEmail(email)) {
            showFormMessage('formMessage', 'Please enter a valid email address.', 'error');
            return;
        }
        
        // Show loading state
        submitBtn.disabled = true;
        submitText.style.display = 'none';
        submitLoader.style.display = 'inline-block';
        formMessage.style.display = 'none';
        
        try {
            const formData = {
                name,
                email,
                message,
                type: formType
            };
            
            const result = await submitForm(formData);
            
            // Show success message
            showFormMessage('formMessage', result.message || 'Thank you for your message! I will get back to you soon.', 'success');
            
            // Reset form
            contactForm.reset();
        } catch (error) {
            showFormMessage('formMessage', error.message || 'Failed to send message. Please try again later.', 'error');
        } finally {
            // Hide loading state
            submitBtn.disabled = false;
            submitText.style.display = 'inline';
            submitLoader.style.display = 'none';
        }
    });
}

// Hire Me Button Handler
const hireMeBtn = document.getElementById('hireMeBtn');
if (hireMeBtn) {
    hireMeBtn.addEventListener('click', () => {
        // Scroll to contact form
        const contactSection = document.querySelector('#contact');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
            
            // Set form type to "hire" and pre-fill message
            setTimeout(() => {
                document.getElementById('formType').value = 'hire';
                document.getElementById('message').value = 'I am interested in hiring you for a project.';
            }, 500);
        }
    });
}

// Let's Talk Button Handler
const letsTalkBtn = document.getElementById('letsTalkBtn');
if (letsTalkBtn) {
    letsTalkBtn.addEventListener('click', () => {
        // Scroll to contact form
        const contactSection = document.querySelector('#contact');
        if (contactSection) {
            contactSection.scrollIntoView({ behavior: 'smooth' });
            
            // Set form type to "talk"
            setTimeout(() => {
                document.getElementById('formType').value = 'talk';
            }, 500);
        }
    });
}

// Add loading animation
window.addEventListener('load', () => {
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease';
        document.body.style.opacity = '1';
    }, 100);
});

// Add parallax effect to home section
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const homeSection = document.querySelector('.home');
    if (homeSection && scrolled < window.innerHeight) {
        homeSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});
