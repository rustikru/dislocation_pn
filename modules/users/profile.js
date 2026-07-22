(function () {
  if (window.userProfileStarted) return
  window.userProfileStarted = true

  function text(value) {
    if (value === null || value === undefined || value === '') return '-'
    return String(value)
  }

  function safe(value) {
    return text(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
  }

  function yesNo(value) {
    const item = String(value || '').toUpperCase()
    if (item === 'Y' || item === '1' || item === 'TRUE') return 'Да'
    if (item === 'N' || item === '0' || item === 'FALSE') return 'Нет'
    return text(value)
  }

  function readAnswer(response) {
    return response.text().then(function (data) {
      if (!data) return {}
      try {
        return JSON.parse(data)
      } catch (e) {
        const shortText = data.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 250)
        throw new Error(shortText ? 'Сервер вернул неверный ответ: ' + shortText : 'Сервер вернул неверный ответ')
      }
    })
  }

  function field(name, label, value, readonly, type) {
    const extra = type === 'password' ? ' autocomplete="new-password"' : ''
    return (
      '<label class="profile-field">' +
        '<span>' + safe(label) + '</span>' +
        '<input type="' + safe(type || 'text') + '" name="' + safe(name) + '" value="' + safe(value || '') + '"' + (readonly ? ' readonly' : '') + extra + '>' +
      '</label>'
    )
  }

  function closeProfile() {
    const box = document.querySelector('.profile-window')
    if (box) box.remove()
  }

  function profileForm(data) {
    return (
      '<form class="profile-form">' +
        field('login', 'Логин', data.LOGIN, true) +
        field('full_name', 'ФИО', data.FULL_NAME, false) +
        field('enterprise', 'Предприятие', data.ENTERPRISE, true) +
        field('division_id', 'Подразделение', data.DIVISION_ID, true) +
        field('phone_num', 'Телефон', data.PHONE_NUM, false) +
        field('email_address', 'Email', data.EMAIL_ADDRESS, false) +
        field('default_station', 'Станция по умолчанию', data.DEFAULT_STATION, false) +
        '<div class="profile-section">Смена пароля</div>' +
        '<input type="hidden" name="pwd_changed" value="N">' +
        field('new_pwd1', 'Новый пароль', '', false, 'password') +
        field('new_pwd2', 'Повтор пароля', '', false, 'password') +
        '<div class="profile-row"><div>Смена пароля</div><div>' + safe(yesNo(data.FLAG_CHANGE_PWD || data.CHANGE_PWD)) + '</div></div>' +
        '<div class="profile-row"><div>Доступ открыт</div><div>' + safe(yesNo(data.OPEN_FLAG)) + '</div></div>' +
        '<div class="profile-message" style="display:none"></div>' +
        '<div class="profile-actions">' +
          '<button type="button" class="profile-cancel">Отмена</button>' +
          '<button type="submit" class="profile-save">Сохранить</button>' +
        '</div>' +
      '</form>'
    )
  }

  function profileHtml(content) {
    return (
      '<div class="profile-window">' +
        '<div class="profile-box">' +
          '<div class="profile-head">' +
            '<div class="profile-title">Мой профиль</div>' +
          '</div>' +
          '<div class="profile-body">' + content + '</div>' +
        '</div>' +
      '</div>'
    )
  }

  function showProfile() {
    closeProfile()
    document.body.insertAdjacentHTML('beforeend', profileHtml('<div class="profile-load">Загрузка...</div>'))

    fetch('/modules/users/profile.php', { credentials: 'same-origin' })
      .then(readAnswer)
      .then(function (answer) {
        const body = document.querySelector('.profile-body')
        if (!body) return
        if (!answer || !answer.ok) {
          body.innerHTML = '<div class="profile-error">' + text(answer && answer.message) + '</div>'
          return
        }
        body.innerHTML = profileForm(answer.data || {})
        const pwd1 = body.querySelector('input[name="new_pwd1"]')
        const pwd2 = body.querySelector('input[name="new_pwd2"]')
        if (pwd1) pwd1.value = ''
        if (pwd2) pwd2.value = ''
      })
      .catch(function () {
        const body = document.querySelector('.profile-body')
        if (body) body.innerHTML = '<div class="profile-error">Не удалось получить данные профиля</div>'
      })
  }

  function saveProfile(form) {
    const message = form.querySelector('.profile-message')
    const button = form.querySelector('.profile-save')
    if (message) {
      message.style.display = 'none'
      message.className = 'profile-message'
      message.textContent = ''
    }
    if (button) button.disabled = true

    const data = new FormData(form)
    const pwd1 = form.elements.new_pwd1
    const pwd2 = form.elements.new_pwd2
    const pwd1Changed = pwd1 && pwd1.dataset.changed === '1'
    const pwd2Changed = pwd2 && pwd2.dataset.changed === '1'
    if (!pwd1Changed && !pwd2Changed) {
      data.delete('new_pwd1')
      data.delete('new_pwd2')
      data.set('pwd_changed', 'N')
    } else {
      data.set('pwd_changed', 'Y')
    }

    fetch('/modules/users/profile.php', {
      method: 'POST',
      credentials: 'same-origin',
      body: data
    })
      .then(readAnswer)
      .then(function (answer) {
        if (!answer || !answer.ok) throw new Error(text(answer && answer.message))
        if (message) {
          message.classList.add('profile-ok')
          message.textContent = 'Сохранено'
          message.style.display = 'block'
        }
        if (pwd1) pwd1.value = ''
        if (pwd2) pwd2.value = ''
        if (pwd1) pwd1.dataset.changed = '0'
        if (pwd2) pwd2.dataset.changed = '0'
      })
      .catch(function (error) {
        if (message) {
          message.classList.add('profile-bad')
          const msg = error && error.message ? error.message : ''
          message.textContent = msg === 'The string did not match the expected pattern.' ? 'Не удалось сохранить профиль' : msg || 'Не удалось сохранить профиль'
          message.style.display = 'block'
        }
      })
      .finally(function () {
        if (button) button.disabled = false
      })
  }

  document.addEventListener('click', function (event) {
    const button = event.target.closest('.user-menu-profile')
    if (button) {
      event.preventDefault()
      document.querySelectorAll('.user-menu.open').forEach(function (item) {
        item.classList.remove('open')
      })
      showProfile()
      return
    }

    if (event.target.closest('.profile-cancel')) {
      closeProfile()
      return
    }

    if (event.target.classList.contains('profile-window')) {
      closeProfile()
    }
  })

  document.addEventListener('submit', function (event) {
    const form = event.target.closest('.profile-form')
    if (!form) return
    event.preventDefault()
    saveProfile(form)
  })

  document.addEventListener('input', function (event) {
    if (event.target && (event.target.name === 'new_pwd1' || event.target.name === 'new_pwd2')) {
      event.target.dataset.changed = '1'
      if (event.target.form && event.target.form.elements.pwd_changed) {
        event.target.form.elements.pwd_changed.value = 'Y'
      }
    }
  })

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeProfile()
  })
})()
