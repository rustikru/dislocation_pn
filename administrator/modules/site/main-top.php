 <div class="headerlt">
					<div class="headerrt">
							<form action="" method="post" class="logout">
								<div class="user-menu">
									<button type="button" class="user-menu-btn">
										<span><?php echo htmlspecialchars($auth->getFullName() ?: $auth->getLogin(), ENT_QUOTES, 'UTF-8'); ?></span>
									</button>
									<div class="user-menu-box">
										<div class="user-menu-title">Мой профиль</div>
										<div class="user-menu-name"><?php echo htmlspecialchars($auth->getFullName(), ENT_QUOTES, 'UTF-8'); ?></div>
										<div class="user-menu-login"><?php echo htmlspecialchars($auth->getLogin(), ENT_QUOTES, 'UTF-8'); ?></div>
										<button type="button" class="user-menu-profile">Мой профиль</button>
										<button type="submit" name="logout" value="1" class="user-menu-exit">Выйти</button>
									</div>
								</div>
							</form>
					</div>
					<script>
					(function () {
						if (window.userMenuStarted) return;
						window.userMenuStarted = true;

						document.addEventListener('click', function (event) {
							var button = event.target.closest('.user-menu-btn');
							var menu = event.target.closest('.user-menu');

							document.querySelectorAll('.user-menu.open').forEach(function (item) {
								if (!menu || item !== menu) item.classList.remove('open');
							});

							if (button && menu) {
								event.preventDefault();
								menu.classList.toggle('open');
							}
						});
					})();
					</script>
					<div class="headerstation">
						<ul class="menu">
							<?php 
								include('main-menu.php');
								echo get_main_menu($auth->getUserId(), $auth->getStationId(), "admin"); 
							?>
						</ul>

					</div>
					<div id="msg_box" class="headermt" style="display: none;">
							Уважаемые пользователи, система будет остановлена на техническое обслуживание в 13.00 на 15 минут!  
					</div>
                </div>
