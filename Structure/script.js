document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.button');
    const backgroundImg = document.getElementById('background-img');

    // Configuration des images
    const maxImagesPerFolder = {
        portfolio: { artwork: 11, tattoo: 18, bijoux: 1 },
        shop: 10,
        nextguest: 4, // Nombre d'images pour nextguest
    };

 // Gestion du survol des boutons
    buttons.forEach(button => {
        button.addEventListener('mouseenter', () => {
            const folder = button.dataset.folder;
            if (folder && backgroundImg) {
                const randomImage = getRandomImage(folder, maxImagesPerFolder);
                console.log(`Chemin généré : ${randomImage}`);
                backgroundImg.src = randomImage || ''; // Définit l'image ou une chaîne vide
                backgroundImg.style.opacity = randomImage ? '0.2' : '0'; // Rend visible ou invisible
            }
        });

        button.addEventListener('mouseleave', () => {
            if (backgroundImg) {
                backgroundImg.style.opacity = '0'; // Réinitialise l'opacité
            }
        });
        

        // Gestion du clic sur les boutons
        button.addEventListener('click', () => {
            const animationContainer = button.querySelector('.animation-container');
            const folder = button.dataset.folder;

            if (animationContainer) {
                animationContainer.classList.add('active');
            }
            button.classList.add('hidden');

            setTimeout(() => {
                if (animationContainer) {
                    animationContainer.classList.remove('active');
                }
                window.location.href = `./${folder}.html`;
            }, 500); // Ajustez selon la durée du GIF
        });
    });

    // Fonction pour obtenir une image aléatoire
    function getRandomImage(folder, config) {
        if (!config[folder]) return ''; // Retourne une chaîne vide si le dossier n'est pas configuré
    
        const isSimpleFolder = typeof config[folder] === 'number';
        if (isSimpleFolder) {
            // Cas d'un dossier simple (exemple : shop, nextguest)
            const maxImages = config[folder];
            const randomIndex = Math.floor(Math.random() * maxImages) + 1;
            return `./images/${folder}/image${randomIndex}.jpg`;
        }
    
        // Cas d'un dossier avec sous-dossiers (exemple : portfolio)
        const subFolders = Object.keys(config[folder]);
        const randomSubFolder = subFolders[Math.floor(Math.random() * subFolders.length)];
        const maxImages = config[folder][randomSubFolder];
        const randomIndex = Math.floor(Math.random() * maxImages) + 1;
        return `./images/${folder}/${randomSubFolder}/image${randomIndex}.jpg`;
    }

    

    
});





    // Where is Chair?

    document.addEventListener('DOMContentLoaded', () => {
        const whereIsChair = document.getElementById('whereischair');
        const chairButton = document.getElementById('chair');
        let chairClickCount = 0;
    
        // Masquer chair au début
        chairButton.style.display = 'none';
    
        // Récupérer les zones des autres boutons
        const buttons = document.querySelectorAll('.button');
        const getExclusionZones = () => {
            return Array.from(buttons).map(button => {
                const rect = button.getBoundingClientRect();
                return {
                    x: rect.left,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                };
            });
        };
    
        // Vérifier si une position est sécurisée
        const isSafePosition = (x, y, exclusionZones, size = 100) => {
            return exclusionZones.every(zone => {
                return (
                    x + size < zone.x || // À gauche de la zone
                    x > zone.x + zone.width || // À droite de la zone
                    y + size < zone.y || // Au-dessus de la zone
                    y > zone.y + zone.height // En dessous de la zone
                );
            });
        };
    
// Calculer une position sécurisée aléatoire pour chair
const getSafePosition = (exclusionZones) => {
    let x, y;
    const centerX = window.innerWidth / 2; // Centre horizontal de l'écran
    const centerY = window.innerHeight / 2; // Centre vertical de l'écran

    do {
        // Générer une position aléatoire pour x et y
        x = Math.random() * (window.innerWidth - 100); // Position horizontale aléatoire
        y = Math.random() * (window.innerHeight - 100); // Position verticale aléatoire

        // Ajustement : Favoriser les zones éloignées du centre
        if (Math.random() > 0.5) {
            x = x < centerX ? x - 50 : x + 50;
            y = y < centerY ? y - 50 : y + 50;
        }

        // Ajustement pour les écrans plus petits
        if (window.innerWidth < 768) {
            x = Math.random() * (window.innerWidth - 80);
            y = Math.random() * (window.innerHeight - 80);
        }
    } while (!isSafePosition(x, y, exclusionZones)); // Vérifier que la position est sécurisée

    return { x, y };
};
    
        // Gérer le clic sur whereischair
whereIsChair.addEventListener('click', () => {
    whereIsChair.style.display = 'none'; // Cache whereischair

    // Calculer les zones d'exclusion
    const exclusionZones = getExclusionZones();

    // Calculer une position sécurisée pour chair
    const chairPos = getSafePosition(exclusionZones);

    // Positionner chair
    chairButton.style.left = `${chairPos.x}px`;
    chairButton.style.top = `${chairPos.y}px`;
    chairButton.style.display = 'block';
});
    
        // Gérer les clics sur chair
        const handleClick = () => {
            chairClickCount++;
        
            // Ajouter une animation avant le repositionnement
            chairButton.classList.add('animate');
        
            // Après l'animation, repositionner chair
            chairButton.addEventListener(
                'animationend',
                () => {
                    chairButton.classList.remove('animate'); // Retirer l'animation
        
                    // Calculer les zones d'exclusion
                    const exclusionZones = getExclusionZones();
        
                    // Recalculer une position sécurisée pour chair
                    const chairPos = getSafePosition(exclusionZones);
        
                    // Repositionner chair
                    chairButton.style.left = `${chairPos.x}px`;
                    chairButton.style.top = `${chairPos.y}px`;
        
                    // Redirection après 5 clics
                    if (chairClickCount === 5) {
                        chairButton.style.display = 'none';
                        setTimeout(() => {
                            window.location.href = 'dinogame.html'; // Rediriger vers game.html
                        }, 500);
                    }
                },
                { once: true } // Empêche le déclenchement multiple
            );
        };
    
        chairButton.addEventListener('click', handleClick);
    });


    // User Auth //

    document.addEventListener('DOMContentLoaded', () => {
        const loginBtn = document.getElementById('login-btn');
        const usernameInput = document.getElementById('username');
        const userInfo = document.getElementById('user-info');
    
        // Check if a user is already logged in
        let currentUser = localStorage.getItem('currentUser');
        if (currentUser) {
            userInfo.textContent = `Logged in as: ${currentUser}`;
            usernameInput.style.display = "none";
            loginBtn.style.display = "none";
        }
    
        loginBtn.addEventListener('click', () => {
            const username = usernameInput.value.trim();
            if (username) {
                localStorage.setItem('currentUser', username);
                userInfo.textContent = `Logged in as: ${username}`;
                usernameInput.style.display = "none";
                loginBtn.style.display = "none";
            }
        });
    });