// Глобальные переменные
let currentUserRole = null;
let currentCharacter = null;

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
    if (!user) { 
        currentUserRole = null; 
        return; 
    }
    try {
        const doc = await firebase.firestore().collection('users').doc(user.uid).get();
        if (doc.exists) {
            currentUserRole = doc.data().role || 'user';
        } else {
            currentUserRole = 'user';
        }
    } catch (e) {
        currentUserRole = 'user';
    }
}

// Загрузка персонажа из Firestore
async function loadCharacter(characterId) {
    try {
        const doc = await firebase.firestore().collection('characters').doc(characterId).get();
        if (!doc.exists) {
            showError('Персонаж не найден');
            return;
        }
        
        currentCharacter = { id: doc.id, ...doc.data() };
        renderCharacterDetail(currentCharacter);
        
    } catch (e) {
        showError('Ошибка загрузки персонажа: ' + e.message);
    }
}

// Отображение детальной информации о персонаже
function renderCharacterDetail(character) {
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

    container.innerHTML = `
        <div class="character-detail-card">
            <div class="character-header">
                <div class="character-portrait">
                    <img src="${character.avatarUrl}" alt="${character.name}" class="avatar-image">
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
                    <h3><i class="fas fa-image"></i> Изображения</h3>
                    <div class="character-images">
                        <div class="image-item">
                            <h4>Аватарка</h4>
                            <img src="${character.avatarUrl}" alt="Аватарка ${character.name}" class="detail-image">
                        </div>
                        <div class="image-item">
                            <h4>Основной арт</h4>
                            <img src="${character.artUrl}" alt="Арт ${character.name}" class="detail-image">
                        </div>
                    </div>
                </div>
                
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
}

// Показать ошибку
function showError(message) {
    const container = document.getElementById('characterDetail');
    container.innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            <h2>Ошибка</h2>
            <p>${message}</p>
            <button onclick="goBack()" class="back-btn">Вернуться назад</button>
        </div>
    `;
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

// Инициализация страницы
document.addEventListener('DOMContentLoaded', async function() {
    // Получаем роль пользователя
    firebase.auth().onAuthStateChanged(async function(user) {
        await fetchUserRole(user);
    });
    
    // Загружаем персонажа
    const characterId = getCharacterIdFromUrl();
    if (characterId) {
        await loadCharacter(characterId);
    } else {
        showError('ID персонажа не указан');
    }
}); 