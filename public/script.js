 // Script simples para scroll suave
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();

                document.querySelector(this.getAttribute('href')).scrollIntoView({
                    behavior: 'smooth'
                });
            });

            const sections = document.querySelectorAll("section");
            const navLinks = document.querySelectorAll(".menu-link");

            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        navLinks.forEach(link => {
                            
                            if (link.getAttribute("href").substring(1) === entry.target.id) {
                                link.classList.add("active");
                            }
                        });
                    }
                });
            }, {
                threshold: 0.6 // Ativa quando 50% da seção estiver visível
            });

            sections.forEach(section => observer.observe(section));
        });

    // JavaScript para Menu Mobile Moderno
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuClose = document.getElementById('menu-close');
    const menuContent = document.getElementById('menu-content');
    const menuOverlay = document.getElementById('menu-overlay');
    const hamburgerMenu = document.querySelector('.hamburger-menu');
    const body = document.body;

    // Função para abrir o menu
    function openMenu() {
        menuContent.classList.add('active');
        menuOverlay.classList.add('active');
        hamburgerMenu.classList.add('active');
        body.style.overflow = 'hidden'; // Previne scroll do body
        
        // Adiciona animação de entrada aos itens do menu
        const menuItems = document.querySelectorAll('.mobile-menu-item');
        menuItems.forEach((item, index) => {
            item.style.animationDelay = `${(index + 1) * 0.1}s`;
        });
    }

    // Função para fechar o menu
    function closeMenu() {
        menuContent.classList.remove('active');
        menuOverlay.classList.remove('active');
        hamburgerMenu.classList.remove('active');
        body.style.overflow = ''; // Restaura scroll do body
    }

    // Event listener para abrir o menu
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.preventDefault();
            openMenu();
        });
    }

    // Event listener para fechar o menu (botão X)
    if (menuClose) {
        menuClose.addEventListener('click', function(e) {
            e.preventDefault();
            closeMenu();
        });
    }

    // Event listener para fechar o menu (clique no overlay)
    if (menuOverlay) {
        menuOverlay.addEventListener('click', function() {
            closeMenu();
        });
    }

    // Fechar menu ao clicar em um link (navegação)
    const menuLinks = document.querySelectorAll('.mobile-menu-link');
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            // Se o link for para uma âncora na mesma página
            const href = this.getAttribute('href');
            if (href && href.startsWith('#')) {
                e.preventDefault();
                closeMenu();
                
                // Smooth scroll para a seção
                const targetSection = document.querySelector(href);
                if (targetSection) {
                    setTimeout(() => {
                        targetSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }, 300); // Delay para permitir que o menu feche primeiro
                }
            } else {
                // Para links externos, apenas fecha o menu
                closeMenu();
            }
            
            // Adiciona efeito visual de clique
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
    });

    // Fechar menu com tecla ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && menuContent.classList.contains('active')) {
            closeMenu();
        }
    });

    // Prevenir scroll quando o menu estiver aberto
    menuContent.addEventListener('touchmove', function(e) {
        e.stopPropagation();
    });

    // Efeito de hover nos links sociais
    const socialLinks = document.querySelectorAll('.mobile-social-link');
    socialLinks.forEach(link => {
        link.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.1)';
        });
        
        link.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });

    // Adicionar efeito de ripple nos links do menu
    menuLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const ripple = document.createElement('span');
            const rect = this.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            const x = e.clientX - rect.left - size / 2;
            const y = e.clientY - rect.top - size / 2;
            
            ripple.style.cssText = `
                position: absolute;
                width: ${size}px;
                height: ${size}px;
                left: ${x}px;
                top: ${y}px;
                background: rgba(166, 139, 91, 0.3);
                border-radius: 50%;
                transform: scale(0);
                animation: ripple 0.6s ease-out;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.appendChild(ripple);
            
            setTimeout(() => {
                ripple.remove();
            }, 600);
        });
    });

    // Adicionar animação de entrada para os ícones
    const menuIcons = document.querySelectorAll('.mobile-menu-link i');
    menuIcons.forEach((icon, index) => {
        icon.addEventListener('mouseenter', function() {
            this.style.animation = 'bounce 0.6s ease';
        });
        
        icon.addEventListener('animationend', function() {
            this.style.animation = '';
        });
    });

    // Detectar orientação do dispositivo e ajustar menu
    function handleOrientationChange() {
        if (menuContent.classList.contains('active')) {
            setTimeout(() => {
                // Reajustar posições se necessário
                menuContent.style.height = '100vh';
            }, 100);
        }
    }

    window.addEventListener('orientationchange', handleOrientationChange);
    window.addEventListener('resize', handleOrientationChange);
});

// CSS adicional para animações (adicionar ao CSS)
const additionalStyles = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes bounce {
        0%, 20%, 60%, 100% {
            transform: translateY(0);
        }
        40% {
            transform: translateY(-10px);
        }
        80% {
            transform: translateY(-5px);
        }
    }
`;

// Injetar CSS adicional
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);


document.addEventListener('DOMContentLoaded', function() {
    const testimonialsSwiper = new Swiper('.testimonials-swiper', {
        // Configurações básicas
        slidesPerView: 1,
        spaceBetween: 30,
        centeredSlides: true,
        loop: true,
        
        // Autoplay
        autoplay: {
            delay: 5000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
        },
        
        // Efeitos de transição
        effect: 'slide',
        speed: 800,
        
        // Navegação
        navigation: {
            nextEl: '.testimonials-next',
            prevEl: '.testimonials-prev',
        },
        
        // Paginação
        pagination: {
            el: '.testimonials-pagination',
            clickable: true,
            dynamicBullets: true,
        },
        
        // Responsividade
        breakpoints: {
            // Mobile
            320: {
                slidesPerView: 1,
                spaceBetween: 20,
                centeredSlides: true,
            },
            // Tablet
            768: {
                slidesPerView: 1.2,
                spaceBetween: 30,
                centeredSlides: true,
            },
            // Desktop pequeno
            1024: {
                slidesPerView: 1.5,
                spaceBetween: 40,
                centeredSlides: true,
            },
            // Desktop grande
            1200: {
                slidesPerView: 2,
                spaceBetween: 50,
                centeredSlides: false,
            },
        },
        
        // Eventos
        on: {
            init: function() {
                // Adiciona animação de fade-in ao inicializar
                const slides = document.querySelectorAll('.testimonials-swiper .swiper-slide');
                slides.forEach((slide, index) => {
                    slide.style.opacity = '0';
                    slide.style.transform = 'translateY(30px)';
                    setTimeout(() => {
                        slide.style.transition = 'all 0.6s ease';
                        slide.style.opacity = '1';
                        slide.style.transform = 'translateY(0)';
                    }, index * 100);
                });
            },
            
            slideChange: function() {
                // Adiciona efeito de pulsação nos bullets ativos
                const activeBullet = document.querySelector('.testimonials-pagination .swiper-pagination-bullet-active');
                if (activeBullet) {
                    activeBullet.style.animation = 'pulse 0.6s ease';
                    setTimeout(() => {
                        activeBullet.style.animation = '';
                    }, 600);
                }
            }
        }
    });
    
    // Pausa o autoplay quando o mouse entra na área dos depoimentos
    const testimonialsSection = document.querySelector('.testimonials-swiper');
    if (testimonialsSection) {
        testimonialsSection.addEventListener('mouseenter', () => {
            testimonialsSwiper.autoplay.stop();
        });
        
        testimonialsSection.addEventListener('mouseleave', () => {
            testimonialsSwiper.autoplay.start();
        });
    }
    
    // Adiciona animação de hover nos cartões
    const testimonialCards = document.querySelectorAll('.testimonial');
    testimonialCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Animação de pulsação para os bullets
const pulseAnimation = `
    @keyframes pulse {
        0% { transform: scale(1.2); }
        50% { transform: scale(1.4); }
        100% { transform: scale(1.2); }
    }
`;

// Adiciona a animação ao CSS
const style = document.createElement('style');
style.textContent = pulseAnimation;
document.head.appendChild(style);

// Função para reinicializar o swiper se necessário
function reinitializeTestimonialsSwiper() {
    const existingSwiper = document.querySelector('.testimonials-swiper');
    if (existingSwiper && existingSwiper.swiper) {
        existingSwiper.swiper.destroy();
    }
    
    // Reinicializa após um pequeno delay
    setTimeout(() => {
        const testimonialsSwiper = new Swiper('.testimonials-swiper', {
            // Mesmas configurações do swiper acima
            slidesPerView: 1,
            spaceBetween: 30,
            centeredSlides: true,
            loop: true,
            autoplay: {
                delay: 5000,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
            },
            effect: 'slide',
            speed: 800,
            navigation: {
                nextEl: '.testimonials-next',
                prevEl: '.testimonials-prev',
            },
            pagination: {
                el: '.testimonials-pagination',
                clickable: true,
                dynamicBullets: true,
            },
            breakpoints: {
                320: {
                    slidesPerView: 1,
                    spaceBetween: 20,
                    centeredSlides: true,
                },
                768: {
                    slidesPerView: 1.2,
                    spaceBetween: 30,
                    centeredSlides: true,
                },
                1024: {
                    slidesPerView: 1.5,
                    spaceBetween: 40,
                    centeredSlides: true,
                },
                1200: {
                    slidesPerView: 2,
                    spaceBetween: 50,
                    centeredSlides: false,
                },
            },
        });
    }, 100);
}