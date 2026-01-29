document.addEventListener('DOMContentLoaded', function() {
    function get(id) { return document.getElementById(id); }

    var savedUser = localStorage.getItem('userName');
    var isBookingPage = window.location.pathname.includes('booking.html');

    // === 1. ОТЧЕТ В КОНСОЛЬ (Все заказы на устройстве) ===
    console.group("📊 ОТЧЕТ СИСТЕМЫ 2026");
    console.log("Пользователь:", savedUser || "Гость");
    var allOrders = JSON.parse(localStorage.getItem('myBookings') || '[]');
    console.log("Сохраненные данные в базе:", allOrders);
    console.groupEnd();

    // === 2. FETCH API СИНХРОНИЗАЦИЯ ===
    async function sync(orderData) {
        const API_URL = "http://web4.informatics.ru:82/api/4fd5b4efa75dbb25fff57f5d71bd78e9";
        if (orderData) {
            let dataToSend = {
                item_name: `Тур: ${orderData.tour} | Юзер: ${orderData.user} | Дата: ${orderData.date}`,
                item_amount: Number(orderData.id.toString().slice(-6)) 
            };
            
            console.log("📡 Отправка данных на сервер...");
            try {
                const response = await fetch(API_URL, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(dataToSend)
                });
                if (response.ok) console.log("✅ Заказ зафиксирован в облаке");
            } catch (e) { console.error("❌ Ошибка отправки:", e); }
        }
        console.log("🔄 Синхронизация списка заказов...");
        try {
            const storageResponse = await fetch(API_URL);
            if (storageResponse.ok) {
                const storageData = await storageResponse.json();
                console.log("📊 Данные в облачном хранилище:", storageData);
        
                if (storageData && storageData.length > 0) {
                    let cloudOrders = (Array.isArray(storageData) ? storageData : [storageData]).map(item => ({
                        id: item.item_amount,
                        tour: (item.item_name.split(' | ')[0] || "Тур").replace("Тур: ", ""),
                        user: (item.item_name.split(' | ')[1] || "Гость").replace("Юзер: ", ""),
                        date: (item.item_name.split(' | ')[2] || "2026").replace("Дата: ", ""),
                        time: "в архиве"
                    }));
                    
                    let all = localOrders.concat(cloudOrders);
                    let unique = all.filter((item, index) => 
                        all.findIndex(t => t.id.toString().endsWith(item.id.toString()) || item.id.toString().endsWith(t.id.toString())) === index
                    );
                    
                    localStorage.setItem('myBookings', JSON.stringify(unique));
                }
            }
        } catch (error) {
            console.error("❌ Ошибка получения данных:", error);
        }
    }
    sync(); 

    // === 3. ВХОД / РЕГИСТРАЦИЯ ===
    var toggleLink = document.querySelector('.login-link');
    var isLoginMode = false;

    if (toggleLink) {
        toggleLink.onclick = function(e) {
            e.preventDefault();
            isLoginMode = !isLoginMode;
            document.querySelector('.gold-title').innerText = isLoginMode ? 'Вход' : 'Регистрация';
            document.querySelector('.btn-gold-action').innerText = isLoginMode ? 'Войти' : 'Создать аккаунт';
            toggleLink.innerText = isLoginMode ? 'Создать аккаунт' : 'Войти в систему';

            var extraFields = [get('regPhone'), get('regAge')];
            extraFields.forEach(function(el) {
                if (el) el.parentElement.style.display = isLoginMode ? 'none' : 'block';
            });
        };
    }

    window.handleRegister = function() {
        var name = get('regName').value.trim();
        var pass = get('regPass').value.trim();

        if (name && pass) {
            localStorage.setItem('userName', name);
            sync({user: name, type: isLoginMode ? 'login' : 'reg'}, "AUTH");
            alert(isLoginMode ? "С возвращением, " + name : "Регистрация успешна!");
            window.location.href = 'index.html';
        } else {
            alert("Заполните Имя и Пароль!");
        }
    };

    // === 4. БРОНИРОВАНИЕ ===
    if (isBookingPage && !savedUser) {
        window.location.href = 'registration.html';
        return; 
    }

    var tourButtons = document.querySelectorAll('.tour-card .btn-book');
    for (var i = 0; i < tourButtons.length; i++) {
        tourButtons[i].onclick = function(e) {
            e.preventDefault();
            if (!savedUser) {
                // Если не вошел — мгновенно отправляем на регистрацию
                window.location.href = 'registration.html';
            } else {
                // Если вошел — разрешаем переход к бронированию
                var card = e.target.closest('.tour-card');
                var tourName = card.querySelector('h2').innerText;
                window.location.href = 'booking.html?tour=' + encodeURIComponent(tourName);
            }
        };
    }
    var orderForm = get('orderForm');
    if (orderForm && isBookingPage) {
        var tourTitle = new URLSearchParams(window.location.search).get('tour') || "Экскурсия";
        if (get('displayTourName')) get('displayTourName').innerText = tourTitle;

        orderForm.onsubmit = function(e) {
            e.preventDefault();
            var bookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
            var order = {
                id: Date.now(),
                user: savedUser,
                tour: tourTitle,
                date: get('date').value,
                time: get('time').value
            };
            
            if(!order.date) { alert("Выберите дату!"); return; }

            bookings.push(order);
            localStorage.setItem('myBookings', JSON.stringify(bookings));
            sync(order, "NEW_ORDER");

            alert("Тур забронирован!");
            window.location.href = 'index.html';
        };
    }
    
    // === 5. СКРОЛЛ-БЛОК (Только для авторизованных) ===
    var statusBox = get('bookingStatus');
    var myBookings = JSON.parse(localStorage.getItem('myBookings') || '[]');
    
    if (statusBox && savedUser && myBookings.length > 0) {
        statusBox.innerHTML = '<div id="scrollContainer" style="display:flex; overflow-x:auto; gap:15px; padding-bottom:15px;"></div>';
        var list = get('scrollContainer');

        for (var j = 0; j < myBookings.length; j++) {
            var item = myBookings[j];
            var el = document.createElement('div');
            el.className = 'booking-info-bar multi';
            el.style.minWidth = "280px"; 
            el.innerHTML = 
                '<div class="info-content">' +
                    '<strong>' + item.tour + '</strong><br>' +
                    '<span>' + item.date + ' в ' + item.time + '</span>' +
                '</div>' +
                '<button class="cancel-btn" data-id="' + item.id + '" style="background:none; border:none; color:red; font-size:26px; cursor:pointer;">&times;</button>';
            list.appendChild(el);
        }

        statusBox.onclick = function(e) {
            if (e.target.classList.contains('cancel-btn')) {
                var idToRemove = Number(e.target.getAttribute('data-id'));
                if(confirm("Удалить заказ?")) {
                    var filtered = myBookings.filter(function(b) { return b.id !== idToRemove; });
                    localStorage.setItem('myBookings', JSON.stringify(filtered));
                    sync({deletedId: idToRemove}, "DELETE");
                    window.location.reload();
                }
            }
        };
    }

    // === 6. ВЫХОД (СОХРАНЕНИЕ ДАННЫХ) ===
    var authBtn = document.querySelector('.come_in button');
    if (authBtn && savedUser) {
        authBtn.innerHTML = '<i class="fa-solid fa-user" style="color: #FFD700; margin-right: 8px;"></i>' + savedUser;
        authBtn.onclick = function() { 
            if(confirm("Выйти? История броней сохранится на этом устройстве.")) { 
                localStorage.removeItem('userName'); 
                window.location.href = 'index.html'; 
            } 
        };
    }

    // === 7. ПОДСВЕТКА ===
    var inputs = document.querySelectorAll('input');
    for (var n = 0; n < inputs.length; n++) {
        inputs[n].oninput = function(e) { e.target.style.borderColor = "#FFD700"; };
        inputs[n].onblur = function(e) { e.target.style.borderColor = ""; };
    }
});