# Обновление правил безопасности Firebase

## Проблема
Ошибка "Missing or insufficient permissions" при загрузке артов означает, что правила безопасности Firestore не позволяют создавать подколлекции `arts` для персонажей.

## Решение

### 1. Откройте консоль Firebase
1. Перейдите на https://console.firebase.google.com/
2. Выберите проект "krevetki-show"
3. В левом меню выберите "Firestore Database"
4. Перейдите на вкладку "Rules"

### 2. Обновите правила безопасности
Замените существующие правила на следующие:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Правила для коллекции пользователей
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Правила для коллекции персонажей
    match /characters/{characterId} {
      // Чтение персонажей разрешено всем авторизованным пользователям
      allow read: if request.auth != null;
      
      // Создание персонажей разрешено авторизованным пользователям
      allow create: if request.auth != null && 
        request.resource.data.authorId == request.auth.uid;
      
      // Обновление персонажей разрешено автору или админу
      allow update: if request.auth != null && 
        (resource.data.authorId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      // Удаление персонажей разрешено автору или админу
      allow delete: if request.auth != null && 
        (resource.data.authorId == request.auth.uid || 
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      
      // Правила для подколлекции артов
      match /arts/{artId} {
        // Чтение артов разрешено всем авторизованным пользователям
        allow read: if request.auth != null;
        
        // Создание артов разрешено автору персонажа или админу
        allow create: if request.auth != null && 
          (get(/databases/$(database)/documents/characters/$(characterId)).data.authorId == request.auth.uid ||
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
        
        // Обновление артов разрешено автору арта или админу
        allow update: if request.auth != null && 
          (resource.data.authorId == request.auth.uid || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
        
        // Удаление артов разрешено автору арта или админу
        allow delete: if request.auth != null && 
          (resource.data.authorId == request.auth.uid || 
           get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin');
      }
    }
  }
}
```

### 3. Сохраните правила
1. Нажмите кнопку "Publish" для сохранения изменений
2. Дождитесь подтверждения об успешном обновлении

### 4. Проверьте работу
После обновления правил:
1. Войдите в аккаунт на сайте
2. Откройте страницу персонажа
3. Попробуйте загрузить арт - ошибка должна исчезнуть

## Что делают эти правила:

### Для пользователей (`/users/{userId}`):
- Пользователи могут читать и изменять только свои профили

### Для персонажей (`/characters/{characterId}`):
- **Чтение**: Все авторизованные пользователи могут просматривать персонажей
- **Создание**: Авторизованные пользователи могут создавать персонажей
- **Обновление/Удаление**: Только автор персонажа или администратор

### Для артов (`/characters/{characterId}/arts/{artId}`):
- **Чтение**: Все авторизованные пользователи могут просматривать арты
- **Создание**: Автор персонажа или администратор может добавлять арты
- **Обновление/Удаление**: Автор арта или администратор

## Безопасность
Эти правила обеспечивают:
- ✅ Только авторизованные пользователи могут работать с данными
- ✅ Пользователи могут изменять только свои данные
- ✅ Администраторы имеют полные права
- ✅ Защита от несанкционированного доступа 