document.addEventListener('DOMContentLoaded', () => {
    const gallery = document.querySelector('.scroll-split-screen');
    const overlay = document.getElementById('overlay');

    // Charger dynamiquement les images pour bijoux
    const imagesPerFolder = 1; // Remplacez par le nombre exact d'images
    for (let i = 1; i <= imagesPerFolder; i++) {
        const img = document.createElement('div');
        img.className = 'split-item';
        img.style.backgroundImage = `url('images/portfolio/bijoux/image${i}.jpg')`;
        gallery.appendChild(img);
    }

    // Gérer les clics sur les images
    gallery.addEventListener('click', (e) => {
        const target = e.target;

        if (target.classList.contains('split-item')) {
            if (target.classList.contains('active')) {
                resetImages();
            } else {
                resetImages();
                target.classList.add('active');
                overlay.classList.remove('hidden');
                gallery.querySelectorAll('.split-item').forEach(item => {
                    if (item !== target) {
                        item.classList.add('dimmed');
                    }
                });
            }
        }
    });

    // Gérer le clic sur l'overlay
    overlay.addEventListener('click', () => {
        resetImages();
    });

    // Fonction pour réinitialiser les états
    function resetImages() {
        gallery.querySelectorAll('.split-item').forEach(item => {
            item.classList.remove('active', 'dimmed');
        });
        overlay.classList.add('hidden');
    }
});

document.addEventListener('DOMContentLoaded', () => {
    // Assure que la page est ancrée en haut au chargement
    window.scrollTo(0, 0);
});