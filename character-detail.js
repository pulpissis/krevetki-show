// Глобальные переменные
let currentUserRole = null;
let currentCharacter = null;
let characterArts = [];
let currentImageIndex = 0;

// Функция для возврата назад
function goBack() {
    window.history.back();
}

// Получение ID персонажа из URL
function getCharacterIdFromUrl() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Загрузка роли пользователя
async function fetchUserRole(user) {
    console.log('Загрузка роли пользователя:', user ? user.email : 'не авторизован');
    
    if (!user) { 
        currentUserRole = null; 
        console.log('Роль пользователя установлена: null');
        return; 
    }
    try {
        const doc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (doc.exists) {
            currentUserRole = doc.data().role || 'user';
        } else {
            currentUserRole = 'user';
        }
        console.log('Роль пользователя установлена:', currentUserRole);
        
        // Убеждаемся, что модальные окна закрыты после загрузки роли
        const uploadModal = document.getElementById('uploadArtModal');
        const galleryModal = document.getElementById('galleryModal');
        
        if (uploadModal && uploadModal.style.display !== 'none') {
            uploadModal.style.display = 'none';
            console.log('Модальное окно загрузки закрыто после загрузки роли');
        }
        
        if (galleryModal && galleryModal.style.display !== 'none') {
            galleryModal.style.display = 'none';
            console.log('Модальное окно галереи закрыто после загрузки роли');
        }
        
    } catch (e) {
        currentUserRole = 'user';
        console.error('Ошибка загрузки роли пользователя:', e);
    }
}

// Загрузка персонажа из Firestore
async function loadCharacter(characterId) {
    console.log('Загрузка персонажа из Firestore:', characterId);
    
    try {
        const doc = await firebase.firestore().collection('characters').doc(characterId).get();
        if (!doc.exists) {
            showError('Персонаж не найден');
            return;
        }
        
        currentCharacter = { id: doc.id, ...doc.data() };
        console.log('Персонаж загружен:', currentCharacter.name);
        
        await loadCharacterArts(characterId);
        renderCharacterDetail(currentCharacter);
        
        // Убеждаемся, что модальные окна закрыты после загрузки персонажа
        const uploadModal = document.getElementById('uploadArtModal');
        const galleryModal = document.getElementById('galleryModal');
        
        if (uploadModal && uploadModal.style.display !== 'none') {
            uploadModal.style.display = 'none';
            console.log('Модальное окно загрузки закрыто после загрузки персонажа');
        }
        
        if (galleryModal && galleryModal.style.display !== 'none') {
            galleryModal.style.display = 'none';
            console.log('Модальное окно галереи закрыто после загрузки персонажа');
        }
        
    } catch (e) {
        console.error('Ошибка загрузки персонажа:', e);
        showError('Ошибка загрузки персонажа: ' + e.message);
    }
}

// Загрузка артов персонажа
async function loadCharacterArts(characterId) {
    console.log('Загрузка артов для персонажа:', characterId);
    
    try {
        const artsSnapshot = await firebase.firestore()
            .collection('characters')
            .doc(characterId)
            .collection('arts')
            .orderBy('createdAt', 'desc')
            .get();
        
        characterArts = artsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        console.log('Загружено артов:', characterArts.length);
        
        // Убеждаемся, что модальные окна закрыты после загрузки артов
        const uploadModal = document.getElementById('uploadArtModal');
        const galleryModal = document.getElementById('galleryModal');
        
        if (uploadModal && uploadModal.style.display !== 'none') {
            uploadModal.style.display = 'none';
            console.log('Модальное окно загрузки закрыто после загрузки артов');
        }
        
        if (galleryModal && galleryModal.style.display !== 'none') {
            galleryModal.style.display = 'none';
            console.log('Модальное окно галереи закрыто после загрузки артов');
        }
        
    } catch (e) {
        console.error('Ошибка загрузки артов:', e);
        characterArts = [];
    }
}

// Отображение детальной информации о персонаже
function renderCharacterDetail(character) {
    console.log('Рендеринг детальной информации персонажа:', character.name);
    
    const container = document.getElementById('characterDetail');
    
    // Формируем характеристики
    const skills = [];
    if (character.height) skills.push(`<li><strong>Рост:</strong> ${character.height}</li>`);
    if (character.age) skills.push(`<li><strong>Возраст:</strong> ${character.age}</li>`);
    if (character.romance) skills.push(`<li><strong>Романтический интерес:</strong> ${character.romance}</li>`);
    
    // Проверяем права на редактирование/удаление
    const currentUser = firebase.auth().currentUser;
    const canEdit = currentUser && (
        currentUser.uid === character.authorId || 
        currentUserRole === 'admin'
    );

    // Формируем галерею артов
    const artsGalleryHTML = renderArtsGallery();

    container.innerHTML = `
        <div class="character-detail-card">
            <div class="character-header">
                <div class="character-portrait">
                    <img src="${character.avatarUrl}" alt="${character.name}" class="avatar-image" onclick="openGallery(0)">
                </div>
                <div class="character-info">
                    <h1>${character.name}</h1>
                    <div class="character-meta">
                        <span class="character-type">${character.type}</span>
                        <span class="character-gender">${character.gender}</span>
                    </div>
                    <p class="character-author">Автор: ${character.authorEmail}</p>
                </div>
            </div>
            
            <div class="character-content">
                <div class="character-section">
                    <h3><i class="fas fa-info-circle"></i> Описание</h3>
                    <p>${character.description || 'Описание не указано'}</p>
                </div>
                
                <div class="character-section">
                    <h3><i class="fas fa-star"></i> Характеристики</h3>
                    <ul class="character-stats">
                        ${skills.length > 0 ? skills.join('') : '<li>Характеристики не указаны</li>'}
                    </ul>
                </div>
                
                <div class="character-section">
                    <h3><i class="fas fa-image"></i> Основные изображения</h3>
                    <div class="character-images">
                        <div class="image-item">
                            <h4>Аватарка</h4>
                            <img src="${character.avatarUrl}" alt="Аватарка ${character.name}" class="detail-image" onclick="openGallery(0)">
                        </div>
                        <div class="image-item">
                            <h4>Основной арт</h4>
                            <img src="${character.artUrl}" alt="Арт ${character.name}" class="detail-image" onclick="openGallery(1)">
                        </div>
                    </div>
                </div>
                
                ${artsGalleryHTML}
                
                ${canEdit ? `
                <div class="character-actions">
                    <button class="edit-btn" onclick="editCharacter('${character.id}')">
                        <i class="fas fa-edit"></i> Редактировать
                    </button>
                    <button class="delete-btn" onclick="deleteCharacter('${character.id}', '${character.name}')">
                        <i class="fas fa-trash"></i> Удалить
                    </button>
                </div>
                ` : ''}
            </div>
        </div>
    `;
    
    console.log('Рендеринг персонажа завершен');
    
    // Убеждаемся, что модальные окна закрыты после рендеринга
    const uploadModal = document.getElementById('uploadArtModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (uploadModal && uploadModal.style.display !== 'none') {
        uploadModal.style.display = 'none';
        console.log('Модальное окно загрузки закрыто после рендеринга');
    }
    
    if (galleryModal && galleryModal.style.display !== 'none') {
        galleryModal.style.display = 'none';
        console.log('Модальное окно галереи закрыто после рендеринга');
    }
}

// Рендеринг галереи артов
function renderArtsGallery() {
    console.log('Рендеринг галереи артов');
    
    const currentUser = firebase.auth().currentUser;
    const canUpload = currentUser && (
        currentUser.uid === currentCharacter.authorId || 
        currentUserRole === 'admin'
    );

    let artsHTML = '';
    
    if (characterArts.length > 0) {
        artsHTML = `
            <div class="arts-grid">
                ${characterArts.map((art, index) => `
                    <div class="art-item" onclick="openGallery(${index + 2})">
                        <img src="${art.imageUrl}" alt="${art.title}" class="art-image">
                        <div class="art-info">
                            <div class="art-title">${art.title}</div>
                            ${art.description ? `<div class="art-description">${art.description}</div>` : ''}
                            <div class="art-author">${art.authorEmail}</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        artsHTML = '<p style="text-align: center; color: var(--text-secondary); font-style: italic;">Арты пока не загружены</p>';
    }

    const result = `
        <div class="character-section">
            <div class="arts-header">
                <h3><i class="fas fa-images"></i> Галерея артов</h3>
                ${canUpload ? `
                    <button class="upload-art-btn" onclick="openUploadModal()">
                        <i class="fas fa-plus"></i> Добавить арт
                    </button>
                ` : ''}
            </div>
            <div class="arts-gallery">
                ${artsHTML}
            </div>
        </div>
    `;
    
    console.log('Галерея артов отрендерена');
    
    // Убеждаемся, что модальные окна закрыты после рендеринга галереи
    const uploadModal = document.getElementById('uploadArtModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (uploadModal && uploadModal.style.display !== 'none') {
        uploadModal.style.display = 'none';
        console.log('Модальное окно загрузки закрыто после рендеринга галереи');
    }
    
    if (galleryModal && galleryModal.style.display !== 'none') {
        galleryModal.style.display = 'none';
        console.log('Модальное окно галереи закрыто после рендеринга галереи');
    }
    
    return result;
}

// Открытие модального окна загрузки арта
function openUploadModal() {
    console.log('Открытие модального окна загрузки - вызвано пользователем');
    const modal = document.getElementById('uploadArtModal');
    if (modal) {
        modal.style.display = 'block';
        setupUploadForm();
    } else {
        console.error('Модальное окно загрузки не найдено');
    }
}

// Закрытие модального окна загрузки арта
function closeUploadModal() {
    console.log('Закрытие модального окна загрузки');
    const modal = document.getElementById('uploadArtModal');
    if (modal) {
        modal.style.display = 'none';
        const form = document.getElementById('uploadArtForm');
        if (form) {
            form.reset();
        }
        const preview = document.getElementById('artPreview');
        if (preview) {
            preview.innerHTML = '';
        }
    }
}

// Настройка формы загрузки
function setupUploadForm() {
    console.log('Настройка формы загрузки');
    
    const form = document.getElementById('uploadArtForm');
    const fileInput = document.getElementById('artFile');
    const preview = document.getElementById('artPreview');

    // Предварительный просмотр изображения
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                preview.innerHTML = `<img src="${e.target.result}" alt="Preview">`;
            };
            reader.readAsDataURL(file);
        }
    });

    // Обработка отправки формы
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        await uploadArt();
    });
    
    console.log('Форма загрузки настроена');
    
    // Убеждаемся, что модальные окна не открываются автоматически при настройке формы
    const uploadModal = document.getElementById('uploadArtModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (uploadModal && uploadModal.style.display !== 'block') {
        console.log('Модальное окно загрузки остается закрытым при настройке формы');
    }
    
    if (galleryModal && galleryModal.style.display !== 'none') {
        galleryModal.style.display = 'none';
        console.log('Модальное окно галереи закрыто при настройке формы загрузки');
    }
}

// Загрузка арта
async function uploadArt() {
    console.log('Начало загрузки арта');
    
    const form = document.getElementById('uploadArtForm');
    const formData = new FormData(form);
    const title = formData.get('artTitle');
    const description = formData.get('artDescription');
    const file = formData.get('artFile');

    if (!file) {
        alert('Пожалуйста, выберите изображение');
        return;
    }

    try {
        // Показываем индикатор загрузки
        const submitBtn = form.querySelector('.submit-btn');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
        submitBtn.disabled = true;

        // Загружаем изображение на ImgBB
        const imgbbData = new FormData();
        imgbbData.append('image', file);
        
        const response = await fetch('https://api.imgbb.com/1/upload?key=2e872047678fd602dab294e858608fd4', {
            method: 'POST',
            body: imgbbData
        });

        if (!response.ok) {
            throw new Error('Ошибка загрузки изображения');
        }

        const result = await response.json();
        const imageUrl = result.data.url;

        // Сохраняем информацию об арте в Firestore
        const currentUser = firebase.auth().currentUser;
        const artData = {
            title: title,
            description: description,
            imageUrl: imageUrl,
            authorId: currentUser.uid,
            authorEmail: currentUser.email,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        await firebase.firestore()
            .collection('characters')
            .doc(currentCharacter.id)
            .collection('arts')
            .add(artData);

        // Обновляем галерею
        await loadCharacterArts(currentCharacter.id);
        renderCharacterDetail(currentCharacter);

        closeUploadModal();
        alert('Арт успешно загружен!');

    } catch (error) {
        console.error('Ошибка загрузки арта:', error);
        alert('Ошибка загрузки арта: ' + error.message);
    } finally {
        const submitBtn = form.querySelector('.submit-btn');
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
        // Убеждаемся, что модальные окна закрыты после загрузки арта
        const uploadModal = document.getElementById('uploadArtModal');
        const galleryModal = document.getElementById('galleryModal');
        
        if (uploadModal && uploadModal.style.display !== 'none') {
            uploadModal.style.display = 'none';
            console.log('Модальное окно загрузки закрыто после загрузки арта');
        }
        
        if (galleryModal && galleryModal.style.display !== 'none') {
            galleryModal.style.display = 'none';
            console.log('Модальное окно галереи закрыто после загрузки арта');
        }
    }
}

// Открытие галереи
function openGallery(startIndex = 0) {
    console.log('Открытие галереи с индексом:', startIndex, '- вызвано пользователем');
    
    // Проверяем, что у нас есть данные персонажа
    if (!currentCharacter) {
        console.error('Нет данных персонажа для открытия галереи');
        return;
    }
    
    currentImageIndex = startIndex;
    
    // Создаем массив всех изображений (аватарка, основной арт + арты)
    const allImages = [
        { url: currentCharacter.avatarUrl, title: 'Аватарка', description: currentCharacter.name },
        { url: currentCharacter.artUrl, title: 'Основной арт', description: currentCharacter.name }
    ];
    
    // Добавляем арты
    characterArts.forEach(art => {
        allImages.push({
            url: art.imageUrl,
            title: art.title,
            description: art.description || ''
        });
    });

    if (allImages.length === 0) {
        alert('Нет изображений для просмотра');
        return;
    }

    // Показываем галерею
    const galleryModal = document.getElementById('galleryModal');
    if (galleryModal) {
        galleryModal.style.display = 'block';
        updateGalleryView(allImages);
        renderGalleryThumbnails(allImages);
    } else {
        console.error('Модальное окно галереи не найдено');
    }
}

// Закрытие галереи
function closeGalleryModal() {
    console.log('Закрытие галереи');
    const modal = document.getElementById('galleryModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

// Обновление основного изображения в галерее
function updateGalleryView(allImages) {
    console.log('Обновление вида галереи, индекс:', currentImageIndex);
    
    const mainImage = document.getElementById('galleryMainImage');
    const title = document.getElementById('galleryImageTitle');
    const description = document.getElementById('galleryImageDescription');

    if (currentImageIndex >= 0 && currentImageIndex < allImages.length) {
        const image = allImages[currentImageIndex];
        mainImage.src = image.url;
        title.textContent = image.title;
        description.textContent = image.description;
    }

    // Обновляем состояние кнопок навигации
    const prevBtn = document.querySelector('.gallery-nav.prev');
    const nextBtn = document.querySelector('.gallery-nav.next');
    
    prevBtn.disabled = currentImageIndex <= 0;
    nextBtn.disabled = currentImageIndex >= allImages.length - 1;
    
    console.log('Вид галереи обновлен');
}

// Рендеринг миниатюр
function renderGalleryThumbnails(allImages) {
    console.log('Рендеринг миниатюр галереи');
    
    const thumbnailsContainer = document.getElementById('galleryThumbnails');
    
    thumbnailsContainer.innerHTML = allImages.map((image, index) => `
        <img src="${image.url}" 
             alt="${image.title}" 
             class="thumbnail ${index === currentImageIndex ? 'active' : ''}"
             onclick="goToImage(${index})">
    `).join('');
    
    console.log('Миниатюры галереи отрендерены');
}

// Переход к изображению
function goToImage(index) {
    console.log('Переход к изображению с индексом:', index);
    
    currentImageIndex = index;
    const allImages = [
        { url: currentCharacter.avatarUrl, title: 'Аватарка', description: currentCharacter.name },
        { url: currentCharacter.artUrl, title: 'Основной арт', description: currentCharacter.name }
    ];
    
    characterArts.forEach(art => {
        allImages.push({
            url: art.imageUrl,
            title: art.title,
            description: art.description || ''
        });
    });

    updateGalleryView(allImages);
    renderGalleryThumbnails(allImages);
    
    console.log('Переход к изображению завершен');
}

// Следующее изображение
function nextImage() {
    console.log('Переход к следующему изображению');
    
    const allImages = [
        { url: currentCharacter.avatarUrl, title: 'Аватарка', description: currentCharacter.name },
        { url: currentCharacter.artUrl, title: 'Основной арт', description: currentCharacter.name }
    ];
    
    characterArts.forEach(art => {
        allImages.push({
            url: art.imageUrl,
            title: art.title,
            description: art.description || ''
        });
    });

    if (currentImageIndex < allImages.length - 1) {
        currentImageIndex++;
        updateGalleryView(allImages);
        renderGalleryThumbnails(allImages);
        console.log('Переход к следующему изображению завершен');
    } else {
        console.log('Достигнут конец галереи');
    }
}

// Предыдущее изображение
function previousImage() {
    console.log('Переход к предыдущему изображению');
    
    const allImages = [
        { url: currentCharacter.avatarUrl, title: 'Аватарка', description: currentCharacter.name },
        { url: currentCharacter.artUrl, title: 'Основной арт', description: currentCharacter.name }
    ];
    
    characterArts.forEach(art => {
        allImages.push({
            url: art.imageUrl,
            title: art.title,
            description: art.description || ''
        });
    });

    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateGalleryView(allImages);
        renderGalleryThumbnails(allImages);
        console.log('Переход к предыдущему изображению завершен');
    } else {
        console.log('Достигнуто начало галереи');
    }
}

// Показать ошибку
function showError(message) {
    console.log('Показ ошибки:', message);
    
    const container = document.getElementById('characterDetail');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Ошибка</h2>
            <p>${message}</p>
            <button onclick="goBack()" class="back-btn">Вернуться назад</button>
        </div>
    `;
    
    // Убеждаемся, что модальные окна закрыты при показе ошибки
    const uploadModal = document.getElementById('uploadArtModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (uploadModal && uploadModal.style.display !== 'none') {
        uploadModal.style.display = 'none';
        console.log('Модальное окно загрузки закрыто при показе ошибки');
    }
    
    if (galleryModal && galleryModal.style.display !== 'none') {
        galleryModal.style.display = 'none';
        console.log('Модальное окно галереи закрыто при показе ошибки');
    }
}

// Функции редактирования и удаления (аналогичные тем, что в script.js)
window.editCharacter = async function(characterId) {
    // Перенаправляем на главную страницу с открытой формой редактирования
    window.location.href = `index.html?edit=${characterId}`;
};

window.deleteCharacter = async function(characterId, characterName) {
    try {
        // Получаем данные персонажа для проверки прав
        const doc = await firebase.firestore().collection('characters').doc(characterId).get();
        if (!doc.exists) {
            alert('Персонаж не найден!');
            return;
        }
        
        const character = doc.data();
        
        // Проверяем права доступа
        const currentUser = firebase.auth().currentUser;
        if (!currentUser || (currentUser.uid !== character.authorId && currentUserRole !== 'admin')) {
            alert('У вас нет прав для удаления этого персонажа!');
            return;
        }
        
        // Подтверждение удаления
        const confirmDelete = confirm(`Вы уверены, что хотите удалить персонажа "${characterName}"? Это действие нельзя отменить.`);
        if (!confirmDelete) return;
        
        // Удаляем персонажа
        await firebase.firestore().collection('characters').doc(characterId).delete();
        
        alert('Персонаж успешно удален!');
        goBack(); // Возвращаемся к галерее
        
    } catch (e) {
        alert('Ошибка при удалении персонажа: ' + e.message);
    }
};

// Глобальные функции для модальных окон
window.openUploadModal = openUploadModal;
window.closeUploadModal = closeUploadModal;
window.openGallery = openGallery;
window.closeGalleryModal = closeGalleryModal;
window.nextImage = nextImage;
window.previousImage = previousImage;
window.goToImage = goToImage;

// Закрытие модальных окон при клике вне их
window.onclick = function(event) {
    const uploadModal = document.getElementById('uploadArtModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (event.target === uploadModal) {
        console.log('Закрытие модального окна загрузки при клике вне его');
        closeUploadModal();
    }
    if (event.target === galleryModal) {
        console.log('Закрытие модального окна галереи при клике вне его');
        closeGalleryModal();
    }
}

// Инициализация страницы
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Страница персонажа загружена - начинаем инициализацию');
    
    // Проверяем, что модальные окна закрыты при загрузке
    const uploadModal = document.getElementById('uploadArtModal');
    const galleryModal = document.getElementById('galleryModal');
    
    if (uploadModal) {
        uploadModal.style.display = 'none';
        console.log('Модальное окно загрузки закрыто при инициализации');
    }
    
    if (galleryModal) {
        galleryModal.style.display = 'none';
        console.log('Модальное окно галереи закрыто при инициализации');
    }
    
    // Получаем роль пользователя
    firebase.auth().onAuthStateChanged(async function(user) {
        console.log('Состояние аутентификации изменилось:', user ? 'пользователь авторизован' : 'пользователь не авторизован');
        await fetchUserRole(user);
    });
    
    // Загружаем персонажа
    const characterId = getCharacterIdFromUrl();
    if (characterId) {
        console.log('Загружаем персонажа с ID:', characterId);
        await loadCharacter(characterId);
        console.log('Персонаж загружен успешно');
    } else {
        console.error('ID персонажа не указан');
        showError('ID персонажа не указан');
    }
    
    console.log('Инициализация страницы завершена');
}); 