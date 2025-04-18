/* Shop */ 


document.addEventListener('DOMContentLoaded', () => {
    const shopIntro = document.getElementById('shop-intro');
    const shopContainer = document.getElementById('shop-container');
    const productGrid = document.querySelector('.products-grid');

    // Temps avant l'apparition de la grille (en millisecondes)
    const delayBeforeShop = 300; // Par exemple, 500ms

    if (shopIntro) {
        shopIntro.addEventListener('animationstart', () => {
            setTimeout(() => {
                shopContainer.classList.add('visible'); // Affiche la grille après le délai
            }, delayBeforeShop);
        });

        shopIntro.addEventListener('animationend', (e) => {
            if (e.animationName === 'shop-move-out') {
                shopIntro.style.display = 'none'; // Masque le SVG après l'animation
            }
        });
    }

    // Générer les cartes produits
    if (productGrid) {
        const products = [
            { id: 1, name: "Bijoux Parapluie", price: 9.99, image: "images/shop/image1.jpg" },
        { id: 2, name: "Chair Xl", price: 150, image: "images/shop/image2.jpg" },
        { id: 3, name: "Tattoo Design 3", price: 19.99, image: "images/shop/image3.jpg" },
        { id: 4, name: "Tattoo Design 4", price: 24.99, image: "images/shop/image4.jpg" },
        { id: 5, name: "Tattoo Design 5", price: 29.99, image: "images/shop/image5.jpg" },
        { id: 6, name: "Tattoo Design 6", price: 34.99, image: "images/shop/image6.jpg" },
        { id: 7, name: "Tattoo Design 7", price: 39.99, image: "images/shop/image7.jpg" },
        { id: 8, name: "Tattoo Design 8", price: 44.99, image: "images/shop/image8.jpg" },
        { id: 9, name: "Tattoo Design 9", price: 49.99, image: "images/shop/image9.jpg" },
        { id: 10, name: "Tattoo Design 10", price: 49.99, image: "images/shop/image10.jpg" },
        ];

        products.forEach(product => {
            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.innerHTML = `
                <img src="${product.image}" alt="${product.name}">
                <h3>${product.name}</h3>
                <p>${product.price} €</p>
                <button class="add-to-cart" data-id="${product.id}">Ajouter au panier</button>
            `;
            productGrid.appendChild(productCard);
        });
    } else {
        console.error('Le conteneur des produits (.products-grid) est introuvable.');
    }
});

if (productGrid) {
    console.log('Grille trouvée, génération des produits...');
    products.forEach(product => {
        console.log(`Ajout du produit : ${product.name}`);
        const productCard = document.createElement('div');
        productCard.className = 'product-card';
        productCard.innerHTML = `
            <img src="${product.image}" alt="${product.name}">
            <h3>${product.name}</h3>
            <p>${product.price} €</p>
            <button class="add-to-cart" data-id="${product.id}">Ajouter au panier</button>
        `;
        productGrid.appendChild(productCard);
    });
}