const characters = [];

// Получаем элементы интерфейса
const searchInput = document.querySelector('.search-input');

function createCharacterCard(character) {
    const card = document.createElement('div');
    card.className = 'character-card-container';

    // Формируем характеристики
    const skills = [];
    if (character.height) skills.push(character.height);
    if (character.age) skills.push(character.age);
    if (character.romance) skills.push(`романтический интерес <${character.romance}>`);

    // Проверяем права на редактирование/удаление
    let canEdit = false;
    if (typeof firebase !== 'undefined') {
        const currentUser = firebase.auth().currentUser;
        canEdit = currentUser && (
            currentUser.uid === character.authorId || 
            window.currentUserRole === 'admin'
        );
    }

    // Транслитерация кириллицы → латиница
    const filename = character.name
        .toLowerCase()
        .replace(/[а-яё]/g, m => {
            const ru = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
            const en = 'abvgdeejzijklmnoprstufhzcss_y_eua';
            return en[ru.indexOf(m)] || '-';
        });

    card.innerHTML = `
    <div class="character-card">
      <div class="card-image-container">
        <img src="${character.avatarUrl || character.artUrl}" alt="${character.name}" loading="lazy">
        <span class="character-type">${character.type}</span>
      </div>
      <div class="card-content">
        <h3>${character.name}</h3>
        <p class="character-description">${character.description || '<Описание>'}</p>
        <div class="character-skills">
          <h4><i class="fas fa-star"></i> Характеристики:</h4>
          <ul>
            ${skills.length > 0 ? skills.map(skill => `<li>${skill}</li>`).join('') : '<li>Характеристики не указаны</li>'}
          </ul>
        </div>
        <div class="character-author">
          <small>Автор: ${character.authorEmail}</small>
        </div>
        <div class="card-actions">
          <a href="character.html?id=${character.id}" class="view-btn">
            <i class="fas fa-eye"></i> Подробнее
          </a>
          ${canEdit ? `
          <button class="edit-btn" onclick="editCharacter('${character.id}')">
            <i class="fas fa-edit"></i> Редактировать
          </button>
          <button class="delete-btn" onclick="deleteCharacter('${character.id}', '${character.name}')">
            <i class="fas fa-trash"></i> Удалить
          </button>
          ` : ''}
        </div>
      </div>
    </div>
  `;

    return card;
}

function renderGallery(data) {
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = '';

    if (data.length === 0) {
        gallery.innerHTML = `
            <div class="no-results">
                <i class="fas fa-fish"></i>
                <p>Пока нет персонажей в галерее</p>
                <p>Зарегистрируйтесь и добавьте своего персонажа!</p>
            </div>
        `;
        return;
    }

    data.forEach(character => {
        const card = createCharacterCard(character);
        gallery.appendChild(card);
    });
}

// Заглушки для будущей функциональности
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, загружен ли Firebase перед инициализацией
    if (typeof firebase === 'undefined') {
        console.error('Firebase не загружен, некоторые функции будут недоступны');
        return;
    }
    
    // Случайный персонаж
    const randomBtn = document.querySelector('.random-btn');
    randomBtn?.addEventListener('click', function() {
        const cards = Array.from(document.querySelectorAll('.character-card'));
        if (cards.length === 0) return;
        const randomCard = cards[Math.floor(Math.random() * cards.length)];
        randomCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        randomCard.classList.add('highlighted');
        setTimeout(() => randomCard.classList.remove('highlighted'), 1200);
    });

    // Сортировка по алфавиту
    const sortBtn = document.querySelector('.sort-btn');
    sortBtn?.addEventListener('click', function() {
        const container = document.querySelector('.gallery-masonry');
        const cards = Array.from(container.querySelectorAll('.character-card'));
        cards.sort((a, b) => {
            const nameA = a.querySelector('h3')?.textContent.trim().toLowerCase() || '';
            const nameB = b.querySelector('h3')?.textContent.trim().toLowerCase() || '';
            return nameA.localeCompare(nameB, 'ru');
        });
        cards.forEach(card => container.appendChild(card));
    });

    // --- Модальные окна ---
    const registerModal = document.getElementById('registerModal');
    const loginModal = document.getElementById('loginModal');
    const registerBtn = document.getElementById('registerBtn');
    const loginBtn = document.getElementById('loginBtn');
    const closeRegister = document.getElementById('closeRegister');
    const closeLogin = document.getElementById('closeLogin');

    // Открытие модалок
    if (registerBtn) registerBtn.onclick = () => { registerModal.style.display = 'flex'; };
    if (loginBtn) loginBtn.onclick = () => { loginModal.style.display = 'flex'; };
    // Закрытие модалок
    if (closeRegister) closeRegister.onclick = () => { registerModal.style.display = 'none'; document.getElementById('registerError').textContent = ''; };
    if (closeLogin) closeLogin.onclick = () => { loginModal.style.display = 'none'; document.getElementById('loginError').textContent = ''; };
    // Клик вне модалки
    window.onclick = function(event) {
        if (event.target === registerModal) { registerModal.style.display = 'none'; document.getElementById('registerError').textContent = ''; }
        if (event.target === loginModal) { loginModal.style.display = 'none'; document.getElementById('loginError').textContent = ''; }
    };

    // --- Firebase Auth ---
    // Регистрация
    const registerSubmit = document.getElementById('registerSubmit');
    if (registerSubmit) {
        registerSubmit.onclick = async function() {
            if (typeof firebase === 'undefined') return;
            
            const email = document.getElementById('registerEmail').value.trim();
            const username = document.getElementById('registerUsername').value.trim();
            const password = document.getElementById('registerPassword').value;
            const password2 = document.getElementById('registerPassword2').value;
            const errorEl = document.getElementById('registerError');
            errorEl.textContent = '';
            
            if (!email || !username || !password || !password2) {
                errorEl.textContent = 'Заполните все поля!';
                return;
            }
            if (password !== password2) {
                errorEl.textContent = 'Пароли не совпадают!';
                return;
            }
            if (password.length < 6) {
                errorEl.textContent = 'Пароль должен содержать минимум 6 символов!';
                return;
            }
            
            try {
                // Показываем индикатор загрузки
                registerSubmit.textContent = 'Регистрация...';
                registerSubmit.disabled = true;
                
                const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
                console.log('Пользователь создан:', userCredential.user.uid);
                
                // Сохраняем профиль пользователя с ролью 'user' и username в Firestore
                await firebase.firestore().collection('users').doc(userCredential.user.uid).set({
                    uid: userCredential.user.uid,
                    email: userCredential.user.email,
                    username: username,
                    role: 'user',
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                console.log('Профиль пользователя сохранен в Firestore');
                
                registerModal.style.display = 'none';
                // Очищаем форму
                document.getElementById('registerEmail').value = '';
                document.getElementById('registerUsername').value = '';
                document.getElementById('registerPassword').value = '';
                document.getElementById('registerPassword2').value = '';
                
                alert('Регистрация успешна! Теперь вы можете войти в аккаунт.');
            } catch (e) {
                console.error('Ошибка регистрации:', e);
                let errorMessage = 'Ошибка регистрации';
                
                switch (e.code) {
                    case 'auth/email-already-in-use':
                        errorMessage = 'Пользователь с таким email уже существует';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Неверный формат email';
                        break;
                    case 'auth/weak-password':
                        errorMessage = 'Пароль слишком слабый';
                        break;
                    default:
                        errorMessage = e.message;
                }
                
                errorEl.textContent = errorMessage;
            } finally {
                registerSubmit.textContent = 'Зарегистрироваться';
                registerSubmit.disabled = false;
            }
        };
    }
    // Вход
    const loginSubmit = document.getElementById('loginSubmit');
    if (loginSubmit) {
        loginSubmit.onclick = async function() {
            if (typeof firebase === 'undefined') return;
            
            const email = document.getElementById('loginEmail').value.trim();
            const password = document.getElementById('loginPassword').value;
            const errorEl = document.getElementById('loginError');
            errorEl.textContent = '';
            
            if (!email || !password) {
                errorEl.textContent = 'Заполните все поля!';
                return;
            }
            
            try {
                await firebase.auth().signInWithEmailAndPassword(email, password);
                loginModal.style.display = 'none';
                // Очищаем форму после успешного входа
                document.getElementById('loginEmail').value = '';
                document.getElementById('loginPassword').value = '';
                alert('Вход выполнен!');
            } catch (e) {
                console.error('Ошибка входа:', e);
                let errorMessage = 'Ошибка входа';
                
                switch (e.code) {
                    case 'auth/invalid-credential':
                        errorMessage = 'Неверный email или пароль';
                        break;
                    case 'auth/user-not-found':
                        errorMessage = 'Пользователь с таким email не найден';
                        break;
                    case 'auth/wrong-password':
                        errorMessage = 'Неверный пароль';
                        break;
                    case 'auth/invalid-email':
                        errorMessage = 'Неверный формат email';
                        break;
                    case 'auth/too-many-requests':
                        errorMessage = 'Слишком много попыток входа. Попробуйте позже';
                        break;
                    default:
                        errorMessage = e.message;
                }
                
                errorEl.textContent = errorMessage;
            }
        };
    }

    // --- Отображение текущего пользователя и выход ---
    const userInfo = document.getElementById('userInfo');
    const userEmail = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');
    function updateAuthUI(user) {
        const loginBtn = document.getElementById('loginBtn');
        const registerBtn = document.getElementById('registerBtn');
        const userInfo = document.getElementById('userInfo');
        const userEmail = document.getElementById('userEmail');
        const profileBtn = document.getElementById('profileBtn');
        const addCharacterBtn = document.getElementById('addCharacterBtn');
        
        if (user) {
            // Пользователь вошёл
            userInfo.style.display = 'flex';
            userEmail.textContent = user.email;
            loginBtn.style.display = 'none';
            registerBtn.style.display = 'none';
            if (profileBtn) profileBtn.style.display = 'flex';
            if (addCharacterBtn) addCharacterBtn.style.display = 'flex';
        } else {
            // Пользователь вышел
            userInfo.style.display = 'none';
            userEmail.textContent = '';
            loginBtn.style.display = '';
            registerBtn.style.display = '';
            if (profileBtn) profileBtn.style.display = 'none';
            if (addCharacterBtn) addCharacterBtn.style.display = 'none';
        }
    }
    // --- Получение роли пользователя ---
    window.currentUserRole = null;
    async function fetchUserRole(user) {
        if (!user || typeof firebase === 'undefined') { window.currentUserRole = null; return; }
        try {
            const doc = await firebase.firestore().collection('users').doc(user.uid).get();
            if (doc.exists) {
                window.currentUserRole = doc.data().role || 'user';
            } else {
                window.currentUserRole = 'user';
            }
        } catch (e) {
            window.currentUserRole = 'user';
        }
    }
    
    if (typeof firebase !== 'undefined') {
        firebase.auth().onAuthStateChanged(async function(user) {
            updateAuthUI(user);
            await fetchUserRole(user);
            // Можно добавить: console.log('Ваша роль:', window.currentUserRole);
        });
    }
    
    // Кнопка выхода
    if (logoutBtn) {
        logoutBtn.onclick = async function() {
            if (typeof firebase === 'undefined') return;
            try {
                await firebase.auth().signOut();
                // Очищаем данные пользователя
                window.currentUserRole = null;
                alert('Вы вышли из аккаунта');
            } catch (e) {
                console.error('Ошибка выхода:', e);
                alert('Ошибка при выходе: ' + e.message);
            }
        };
    }

    // --- Модальное окно добавления персонажа ---
    const addCharacterModal = document.getElementById('addCharacterModal');
    const closeAddCharacter = document.getElementById('closeAddCharacter');

    // Закрытие модалки добавления персонажа
    if (closeAddCharacter) {
        closeAddCharacter.onclick = () => {
            addCharacterModal.style.display = 'none';
            document.getElementById('addCharacterError').textContent = '';
            // Очищаем форму
            document.getElementById('addCharacterModal').querySelector('form')?.reset();
        };
    }

    // Клик вне модалки добавления персонажа
    window.onclick = function(event) {
        if (event.target === registerModal) { 
            registerModal.style.display = 'none'; 
            document.getElementById('registerError').textContent = ''; 
        }
        if (event.target === loginModal) { 
            loginModal.style.display = 'none'; 
            document.getElementById('loginError').textContent = ''; 
        }
        if (event.target === addCharacterModal) { 
            addCharacterModal.style.display = 'none'; 
            document.getElementById('addCharacterError').textContent = '';
        }
    };

    // --- Загрузка изображения на ImgBB ---
    async function uploadImageToImgBB(file) {
        const formData = new FormData();
        formData.append('image', file);
        
        const response = await fetch(`https://api.imgbb.com/1/upload?key=2e872047678fd602dab294e858608fd4`, {
            method: 'POST',
            body: formData
        });
        
        const data = await response.json();
        if (data.success) {
            return data.data.url;
        } else {
            throw new Error('Ошибка загрузки изображения');
        }
    }

    // --- Добавление персонажа ---
    const addCharacterSubmit = document.getElementById('addCharacterSubmit');
    if (addCharacterSubmit) {
        addCharacterSubmit.onclick = async function() {
            if (typeof firebase === 'undefined') return;
            
            const errorEl = document.getElementById('addCharacterError');
            errorEl.textContent = '';
            
            try {
                // Получаем данные из формы
                const name = document.getElementById('charName').value.trim();
                const type = document.getElementById('charType').value;
                const gender = document.getElementById('charGender').value;
                const description = document.getElementById('charDescription').value.trim();
                const height = document.getElementById('charHeight').value.trim();
                const age = document.getElementById('charAge').value.trim();
                const romance = document.getElementById('charRomance').value.trim();
                const avatarFile = document.getElementById('charAvatar').files[0];
                const artFile = document.getElementById('charArt').files[0];

                // Проверяем обязательные поля
                if (!name || !type || !gender) {
                    errorEl.textContent = 'Заполните все обязательные поля!';
                    return;
                }

                // Проверяем, это добавление или редактирование
                const characterId = document.getElementById('addCharacterModal').dataset.characterId;
                const isEditing = !!characterId;

                // При редактировании изображения не обязательны
                if (!isEditing && (!avatarFile || !artFile)) {
                    errorEl.textContent = 'Загрузите изображения!';
                    return;
                }

                // Показываем индикатор загрузки
                addCharacterSubmit.textContent = isEditing ? 'Сохранение...' : 'Загрузка...';
                addCharacterSubmit.disabled = true;

                // Загружаем новые изображения, если они выбраны
                let avatarUrl = null;
                let artUrl = null;
                
                if (avatarFile) {
                    avatarUrl = await uploadImageToImgBB(avatarFile);
                }
                if (artFile) {
                    artUrl = await uploadImageToImgBB(artFile);
                }

                // Создаем объект персонажа
                const characterData = {
                    name: name,
                    type: type,
                    gender: gender,
                    description: description || '',
                    height: height || '',
                    age: age || '',
                    romance: romance || '',
                    authorId: firebase.auth().currentUser.uid,
                    authorEmail: firebase.auth().currentUser.email
                };

                // Добавляем новые URL изображений, если они есть
                if (avatarUrl) characterData.avatarUrl = avatarUrl;
                if (artUrl) characterData.artUrl = artUrl;

                if (isEditing) {
                    // Обновляем существующего персонажа
                    await firebase.firestore().collection('characters').doc(characterId).update(characterData);
                    alert('Персонаж успешно обновлен!');
                } else {
                    // Добавляем нового персонажа
                    characterData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    await firebase.firestore().collection('characters').add(characterData);
                    alert('Персонаж успешно добавлен!');
                }

                // Закрываем модалку и очищаем форму
                addCharacterModal.style.display = 'none';
                document.getElementById('addCharacterModal').querySelectorAll('input, textarea, select').forEach(el => el.value = '');
                
                // Сбрасываем режим редактирования
                document.getElementById('addCharacterModal').dataset.characterId = '';
                document.querySelector('#addCharacterModal h2').textContent = 'Добавить персонажа';
                addCharacterSubmit.textContent = 'Добавить персонажа';
                
                // Обновляем галерею
                loadCharacters();

            } catch (e) {
                errorEl.textContent = e.message;
            } finally {
                addCharacterSubmit.textContent = 'Добавить персонажа';
                addCharacterSubmit.disabled = false;
            }
        };
    }

    // --- Поиск и фильтрация персонажей ---
    let allCharacters = []; // Глобальная переменная для хранения всех персонажей
    let displayedCharacters = []; // Персонажи, которые сейчас отображаются
    let lastDoc = null; // Последний документ для пагинации
    let isLoading = false; // Флаг загрузки
    const charactersPerPage = 12; // Количество персонажей на страницу
    
    // Обновляем функцию загрузки персонажей
    async function loadCharacters(loadMore = false) {
        if (isLoading || typeof firebase === 'undefined') return;
        
        try {
            isLoading = true;
            
            // Показываем индикатор загрузки
            if (loadMore) {
                const loadMoreBtn = document.getElementById('loadMoreBtn');
                if (loadMoreBtn) {
                    loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';
                    loadMoreBtn.disabled = true;
                }
            }
            
            let query = firebase.firestore().collection('characters')
                .orderBy('createdAt', 'desc')
                .limit(charactersPerPage);
            
            // Если загружаем еще, начинаем с последнего документа
            if (loadMore && lastDoc) {
                query = query.startAfter(lastDoc);
            }
            
            const snapshot = await query.get();
            
            if (snapshot.empty) {
                if (loadMore) {
                    // Больше персонажей нет
                    hideLoadMoreButton();
                }
                return;
            }
            
            const newCharacters = [];
            snapshot.forEach(doc => {
                newCharacters.push({ id: doc.id, ...doc.data() });
            });
            
            // Сохраняем последний документ для следующей загрузки
            lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            if (loadMore) {
                // Добавляем к уже загруженным
                allCharacters = [...allCharacters, ...newCharacters];
                displayedCharacters = [...displayedCharacters, ...newCharacters];
            } else {
                // Первая загрузка
                allCharacters = newCharacters;
                displayedCharacters = newCharacters;
            }
            
            renderGallery(displayedCharacters);
            showLoadMoreButton(snapshot.docs.length === charactersPerPage);
            
        } catch (e) {
            console.error('Ошибка загрузки персонажей:', e);
        } finally {
            isLoading = false;
            
            // Восстанавливаем кнопку "Загрузить еще"
            const loadMoreBtn = document.getElementById('loadMoreBtn');
            if (loadMoreBtn) {
                loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Загрузить еще';
                loadMoreBtn.disabled = false;
            }
        }
    }

    // Функция поиска персонажей (обновленная для работы с пагинацией)
    function searchCharacters(query) {
        if (!query.trim()) {
            // Если поиск пустой, показываем загруженных персонажей
            renderGallery(displayedCharacters);
            return;
        }

        const searchTerm = query.toLowerCase().trim();
        const filtered = allCharacters.filter(character => {
            return (
                character.name.toLowerCase().includes(searchTerm) ||
                character.type.toLowerCase().includes(searchTerm) ||
                (character.description && character.description.toLowerCase().includes(searchTerm)) ||
                (character.height && character.height.toLowerCase().includes(searchTerm)) ||
                (character.age && character.age.toLowerCase().includes(searchTerm)) ||
                (character.romance && character.romance.toLowerCase().includes(searchTerm)) ||
                (character.gender && character.gender.toLowerCase().includes(searchTerm))
            );
        });
        
        renderGallery(filtered);
        // При поиске скрываем кнопку "Загрузить еще"
        hideLoadMoreButton();
    }

    // Функции для управления кнопкой "Загрузить еще"
    function showLoadMoreButton(show) {
        let loadMoreBtn = document.getElementById('loadMoreBtn');
        if (!loadMoreBtn) {
            loadMoreBtn = document.createElement('button');
            loadMoreBtn.id = 'loadMoreBtn';
            loadMoreBtn.className = 'load-more-btn';
            loadMoreBtn.innerHTML = '<i class="fas fa-plus"></i> Загрузить еще';
            loadMoreBtn.onclick = () => loadCharacters(true);
            
            // Вставляем кнопку после галереи
            const gallery = document.getElementById('gallery');
            gallery.parentNode.insertBefore(loadMoreBtn, gallery.nextSibling);
        }
        
        loadMoreBtn.style.display = show ? 'block' : 'none';
    }

    function hideLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }

    // --- Сортировка персонажей ---
    let currentSort = 'date'; // date, name, type, author
    let isAscending = false;

    function sortCharacters(sortBy) {
        let charactersToSort = [...displayedCharacters]; // Сортируем только отображаемых
        
        switch (sortBy) {
            case 'name':
                charactersToSort.sort((a, b) => {
                    return isAscending ? 
                        b.name.localeCompare(a.name) : 
                        a.name.localeCompare(b.name);
                });
                break;
            case 'type':
                charactersToSort.sort((a, b) => {
                    return isAscending ? 
                        b.type.localeCompare(a.type) : 
                        a.type.localeCompare(b.type);
                });
                break;
            case 'author':
                charactersToSort.sort((a, b) => {
                    return isAscending ? 
                        b.authorEmail.localeCompare(a.authorEmail) : 
                        a.authorEmail.localeCompare(b.authorEmail);
                });
                break;
            case 'date':
            default:
                charactersToSort.sort((a, b) => {
                    const dateA = a.createdAt ? a.createdAt.toDate() : new Date(0);
                    const dateB = b.createdAt ? b.createdAt.toDate() : new Date(0);
                    return isAscending ? dateA - dateB : dateB - dateA;
                });
                break;
        }
        
        renderGallery(charactersToSort);
        // При сортировке скрываем кнопку "Загрузить еще"
        hideLoadMoreButton();
    }

    // Подключаем поиск
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchCharacters(e.target.value);
        });
    }

    // Подключаем сортировку
    if (sortBtn) {
        sortBtn.addEventListener('click', () => {
            // Циклически переключаем сортировку
            const sortOptions = ['date', 'name', 'type', 'author'];
            const currentIndex = sortOptions.indexOf(currentSort);
            const nextIndex = (currentIndex + 1) % sortOptions.length;
            currentSort = sortOptions[nextIndex];
            
            // Обновляем текст кнопки
            const sortLabels = {
                'date': 'По дате',
                'name': 'По имени', 
                'type': 'По типу',
                'author': 'По автору'
            };
            
            sortBtn.innerHTML = `<i class="fas fa-sort-alpha-${isAscending ? 'up' : 'down'}"></i> ${sortLabels[currentSort]}`;
            
            sortCharacters(currentSort);
        });
    }

    // Загружаем персонажей при загрузке страницы
    loadCharacters();

    // --- Кнопки профиля и добавления персонажа ---
    const profileBtn = document.getElementById('profileBtn');
    const addCharacterBtn = document.getElementById('addCharacterBtn');

    console.log('Кнопки элементы:', { 
        profileBtn: profileBtn, 
        addCharacterBtn: addCharacterBtn,
        profileBtnExists: !!profileBtn,
        addCharacterBtnExists: !!addCharacterBtn
    });

    // Обработчик для кнопки "Добавить персонажа"
    if (addCharacterBtn) {
        console.log('Добавляем обработчик к кнопке "Добавить персонажа"');
        
        addCharacterBtn.addEventListener('click', function(event) {
            console.log('Клик по кнопке "Добавить персонажа"');
            event.preventDefault();
            
            if (typeof firebase === 'undefined') {
                alert('Firebase не загружен!');
                return;
            }
            
            if (!firebase.auth().currentUser) {
                alert('Сначала войдите в аккаунт!');
                return;
            }
            
            // Открываем модальное окно добавления персонажа
            const addCharacterModal = document.getElementById('addCharacterModal');
            if (addCharacterModal) {
                addCharacterModal.style.display = 'flex';
                console.log('Модальное окно добавления персонажа открыто');
            } else {
                console.error('Модальное окно добавления персонажа не найдено');
            }
        });
        
        console.log('Обработчик добавлен к кнопке "Добавить персонажа"');
    } else {
        console.error('Кнопка "Добавить персонажа" не найдена!');
    }

    // Тестовая кнопка для отладки
    const testProfileBtn = document.getElementById('testProfileBtn');
    if (testProfileBtn) {
        testProfileBtn.addEventListener('click', function() {
            console.log('Тестовая кнопка нажата');
            console.log('Состояние кнопок:', {
                profileBtn: profileBtn,
                addCharacterBtn: addCharacterBtn,
                profileBtnDisplay: profileBtn ? profileBtn.style.display : 'не найдена',
                addCharacterBtnDisplay: addCharacterBtn ? addCharacterBtn.style.display : 'не найдена'
            });
        });
    }

    // Функция для проверки пользователей (для отладки)
    window.checkUsers = async function() {
        if (typeof firebase === 'undefined') {
            alert('Firebase не загружен');
            return;
        }
        
        try {
            const usersSnapshot = await firebase.firestore().collection('users').get();
            console.log('Всего пользователей:', usersSnapshot.size);
            
            let userList = 'Зарегистрированные пользователи:\n\n';
            usersSnapshot.forEach(doc => {
                const userData = doc.data();
                userList += `Email: ${userData.email}\n`;
                userList += `Username: ${userData.username}\n`;
                userList += `Role: ${userData.role}\n`;
                userList += `UID: ${userData.uid}\n`;
                userList += '---\n';
            });
            
            if (usersSnapshot.size === 0) {
                userList = 'Пользователей пока нет';
            }
            
            alert(userList);
        } catch (e) {
            console.error('Ошибка при получении пользователей:', e);
            alert('Ошибка при получении пользователей: ' + e.message);
        }
    };
});

// Стилизация выделения для случайного персонажа
const style = document.createElement('style');
style.innerHTML = `.character-card.highlighted { box-shadow: 0 0 0 4px var(--highlight), 0 15px 30px rgba(0,119,182,0.18); transition: box-shadow 0.3s; }`;
document.head.appendChild(style);

// Глобальные функции для редактирования и удаления персонажей
window.editCharacter = async function(characterId) {
    if (typeof firebase === 'undefined') return;
    
    try {
        // Получаем данные персонажа
        const doc = await firebase.firestore().collection('characters').doc(characterId).get();
        if (!doc.exists) {
            alert('Персонаж не найден!');
            return;
        }
        
        const character = doc.data();
        
        // Проверяем права доступа
        const currentUser = firebase.auth().currentUser;
        if (!currentUser || (currentUser.uid !== character.authorId && window.currentUserRole !== 'admin')) {
            alert('У вас нет прав для редактирования этого персонажа!');
            return;
        }
        
        // Заполняем форму редактирования
        document.getElementById('charName').value = character.name;
        document.getElementById('charType').value = character.type;
        document.getElementById('charGender').value = character.gender;
        document.getElementById('charDescription').value = character.description || '';
        document.getElementById('charHeight').value = character.height || '';
        document.getElementById('charAge').value = character.age || '';
        document.getElementById('charRomance').value = character.romance || '';
        
        // Меняем заголовок и кнопку
        document.querySelector('#addCharacterModal h2').textContent = 'Редактировать персонажа';
        document.getElementById('addCharacterSubmit').textContent = 'Сохранить изменения';
        
        // Сохраняем ID персонажа для обновления
        document.getElementById('addCharacterModal').dataset.characterId = characterId;
        
        // Открываем модалку
        document.getElementById('addCharacterModal').style.display = 'flex';
        
    } catch (e) {
        alert('Ошибка при загрузке персонажа: ' + e.message);
    }
};

window.deleteCharacter = async function(characterId, characterName) {
    if (typeof firebase === 'undefined') return;
    
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
        if (!currentUser || (currentUser.uid !== character.authorId && window.currentUserRole !== 'admin')) {
            alert('У вас нет прав для удаления этого персонажа!');
            return;
        }
        
        // Подтверждение удаления
        const confirmDelete = confirm(`Вы уверены, что хотите удалить персонажа "${characterName}"? Это действие нельзя отменить.`);
        if (!confirmDelete) return;
        
        // Удаляем персонажа
        await firebase.firestore().collection('characters').doc(characterId).delete();
        
        alert('Персонаж успешно удален!');
        loadCharacters(); // Обновляем галерею
        
    } catch (e) {
        alert('Ошибка при удалении персонажа: ' + e.message);
    }
};