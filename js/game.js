let gameState = {
	preload: preloadGame,
	create: createGame,
	update: updateGame
};

let pathToLevels = "../assets/levels/";
let player, controls;
let platforms, obstacles, enemies;
let levelConf;
let remainingFloors;
let remainingFloorsText;
let currentPowerup, powerupIcon, extraLife;
let lifeSprites;
let lastVel;

const INITIAL_PLAYER_Y = 50, INITIAL_PLATFORM_Y = 400;
const PLATFORM_GAP = 300;
const PLATFORM_VEL = 250;
const PLATFORM_VEL_INCREMENT = 20;
const PLATFORM_WIDTH = 600 / 6; // El 600 es perq es el game.width
const PLAYER_GRAVITY = 1000;
const DEFAULT_VEL = PLAYER_GRAVITY * 0.55, DESTRUCTION_VEL = DEFAULT_VEL * 2.5, ON_DESTRUCTION_LOST_VEL = DEFAULT_VEL * 1.2;
const NUM_LEVELS = 6;
const POWERUP_DURATION = 4;
const SPRING_IMPULSE = 1500; // 1500 = 3 pisos
const ENEMIE_VELOCITY = 150;

function preloadGame() {
	loadSprites();
	loadImages();
	loadSounds();
	loadLevel(levelToPlay);
}


//----UPDATE--------------------------------------------------------------------------------------

function updateGame() {

	manageInput();
	managePlatformsPosition()

	game.physics.arcade.collide(player, platforms, onPlatformCollide, onPlatformProcess, this);
	game.physics.arcade.collide(player, obstacles, onObstacleCollide, onObstacleProcess, this);

	animPlayer();
}

function onPlatformCollide(player, cube) { // Se crida cuan els objectes ja han xocat
	
	player.body.velocity.y = -DEFAULT_VEL;
	remainingFloors = levelConf.data.length - calculateCurrentFloor(cube.position.y) - 1;	
	updateText();

	if (cube.type == 'grass_carrotgold') {
		game.add.audio('carrotSnd').play();
		cube.children[0].kill();
		currentPowerup = POWERUP_DURATION;
		powerupIcon.visible = true;

	} else if (cube.type == 'grass_carrot') {
		game.add.audio('carrotSnd').play();
		cube.children[0].kill();

		extraLife.visible = true;
	}

	if (cube.type == 'stone') {
		win();
		return;
	}	

	updateEnemies();
	game.add.audio('jumpSnd').play();
}

function onPlatformProcess(player, cube) { // Se crida antes de que xoquen, per si vols comprovar algo per a anular la colisió

	if (cube.type == 'stone')
		return true;
	else if (currentPowerup > 0) {
		game.add.audio('breakSnd').play();
		destroyCube(cube);
		player.body.velocity.y = 100;
		currentPowerup--;
		if (currentPowerup <= 0) {
			powerupIcon.visible = false;
		}
		return false;
	}
	else if (player.body.velocity.y < 0) { // Si el conill ve de baix (spring)
		return false;
	} else if (cube.type == 'grass_broken') {
		game.add.audio('breakSnd').play();
		destroyCube(cube);
		return true;
	}

	if (player.body.velocity.y > DESTRUCTION_VEL) {
		game.add.audio('breakSnd').play();
		destroyCube(cube);
		player.body.velocity.y -= ON_DESTRUCTION_LOST_VEL;
		return false;
	}

	return true;
}

function onObstacleCollide(player, obstacle) {

	player.body.velocity.x = 0;

	if (obstacle.type == 'spring') {
		onSpringCollision(player, obstacle)

	} else if (obstacle.type == 'cactus') {
		onCactusCollision(player, obstacle);
	} else if (obstacle.type == 'flyMan') {
		onFlyManCollision(player, obstacle);
	}
	
}

function onCactusCollision(player, obstacle) {
	if (lifes > 1 || extraLife.visible) {
		game.add.audio('hitSnd').play();
		player.body.velocity.x = 0;
		player.body.velocity.y = 70;
		destroyObstacle(obstacle);
		if (extraLife.visible)
			extraLife.visible = false;
		else
			lifeSprites.children[--lifes].destroy();
	} else {
		
		player.children[0].visible = true;
		player.children[1].visible = true;
		game.add.audio('explosionSnd').play();
		player.children[1].animations.play('bye'); //#C Si bunny per raere de la explosió		
	}
}

function onFlyManCollision(player, obstacle) {
	if (lifes > 1 || extraLife.visible) {
		game.add.audio('hitSnd').play();
		player.body.velocity.x = 0;
		player.body.velocity.y = 70;
		destroyObstacle(obstacle);
		if (extraLife.visible)
			extraLife.visible = false;
		else
			lifeSprites.children[--lifes].destroy();
	} else {
		
		player.children[0].visible = true;
		player.children[1].visible = true;
		game.add.audio('explosionSnd').play();
		player.children[1].animations.play('bye'); //#C Si bunny per raere de la explosió		
	}
}



function onSpringCollision(player, obstacle) {
	player.body.velocity.y = -SPRING_IMPULSE;	
	obstacle.animations.play('used');
}


function animPlayer() {
	if (player.body.velocity.y > 160) {
		player.animations.play('stand')
	} else {
		player.animations.play('jump')
	}
}

function updateEnemies() {

	for (let i = 0; i < obstacles.children.length; i++) {
		let e = obstacles.children[i];
		if (e.type == 'flyMan') {
			if (Math.abs(player.body.y - e.body.y) < game.height / 2 && e.vel == 0) {
				let v = Math.random() * 2 - 1;

				e.vel = ENEMIE_VELOCITY * v;
				e.body.velocity.x += e.vel
				e.animations.play('fly');

				if (v < 0) {
					e.scale.setTo(-e.scale.x, e.scale.y)
				}
			}
		}
	}

}

function win() {
	game.sound.stopAll();
	if (levelToPlay++ < NUM_LEVELS) {
		lifes = 3;
		currentPowerup = 0;
		game.state.start('game', gameState);
	} else {
		game.state.start('about', aboutState);
	}

}

function onObstacleProcess(player, obstacle) {
	if (currentPowerup > 0) {
		destroyObstacle(obstacle);
		return false;
	}
}

function destroyObstacle(obstacle) {
	obstacle.visible = false;
	obstacle.body.enable = false;
}

function destroyCube(cube) {
	cube.visible = false;
	cube.body.enable = false;
}

function destroyCubeLetter(cube) {
	let vanishBlock = game.add.tween(cube).to({alpha: 0}, 500, Phaser.Easing.Linear.None);
	vanishBlock.start();
	cube.body.enable = false;	
}

function manageInput() {

	let vel = 0;
	let mouseX = game.input.mousePointer.x;

	//mouse
	if (!game.input.mousePointer.withinGame) {
		//keys
		if (controls.right.isDown)
			vel = -PLATFORM_VEL - levelToPlay * PLATFORM_VEL_INCREMENT;
		else if (controls.left.isDown)
			vel = PLATFORM_VEL + levelToPlay * PLATFORM_VEL_INCREMENT;

	} else if (mouseX < game.width / 2) {
		vel = PLATFORM_VEL + levelToPlay * PLATFORM_VEL_INCREMENT;
	} else if (mouseX > game.width / 2) {
		vel = -PLATFORM_VEL - levelToPlay * PLATFORM_VEL_INCREMENT;
		
	}
	

	if (vel != lastVel) { // optimitzación
		for (let i = 0; i < platforms.children.length; i++)
			platforms.children[i].body.velocity.x = vel;


		for (let i = 0; i < obstacles.children.length; i++) {
			let e = obstacles.children[i];

			if (e.type == 'flyMan') {
				e.body.velocity.x = vel + e.vel;
			} else {
				e.body.velocity.x = vel;
			}
		}
	}

	lastVel = vel;

}

function managePlatformsPosition() {
	if (platforms.children[0].body.velocity.x > 0) { // Les plataformes van cap a la dreta
		for (let i = 0; i < platforms.children.length; i++) {
			if (platforms.children[i].position.x > game.width) {
				platforms.children[i].position.x -= 8 * PLATFORM_WIDTH;
			}
		}

		for(let i = 0; i < obstacles.children.length; i++) {
			if (obstacles.children[i].position.x > game.width) {
				obstacles.children[i].position.x -= 8 * PLATFORM_WIDTH;
			}
		}

	} else if (platforms.children[0].body.velocity.x < 0) { // Les plataformes van cap a la esquerra
		for (let i = 0; i < platforms.children.length; i++) {
			if (platforms.children[i].position.x < -PLATFORM_WIDTH) {
				platforms.children[i].position.x += 8 * PLATFORM_WIDTH;
			}
		}

		for(let i = 0; i < obstacles.children.length; i++) {
			if (obstacles.children[i].position.x < 0) {
				obstacles.children[i].position.x += 8 * PLATFORM_WIDTH;
			}
		}
	}

}

function calculateCurrentFloor(platformY) {
	return (platformY - INITIAL_PLATFORM_Y) / PLATFORM_GAP // INITIAL_PLATFORM_Y + PLATFORM_GAP * nFloor = platformY
}

function updateText() {
	remainingFloorsText.setText(remainingFloors);
}


function explosionAnimationFinished() {
	game.state.start('endScreen', endScreenState);
}

function gameScreenOnDown() {

	let keyPressed = game.input.keyboard.event.key.toLowerCase();

	for (let i = 0; i < platforms.children.length; i++) {
		let platformType = platforms.children[i].type;
		if (platformType.substring(0, 12) == 'grass_letter' && platformType.substring(13, 14).toLowerCase() == keyPressed) {
			destroyCubeLetter(platforms.children[i]);
		}
	}
}
//----CREATE--------------------------------------------------------------------------------------

function createGame() {
	// Carreguem la info del nivell
	levelConf = JSON.parse(game.cache.getText('currentLevel')); // Carrega el arxiu que hem precarregat en el preload (loadLevel) en la key currentLevel


	// Bordes
	game.world.setBounds(0, 0, levelConf.dimensions.width, INITIAL_PLATFORM_Y + levelConf.data.length * PLATFORM_GAP);

	// Fondo
	let bg = game.add.tileSprite(0, 0, game.world.width, game.world.height, 'bgGame');
	bg.scrollFactorX = 0.7;
	bg.scrollFactorY = 0.7;

	
	createPlayer();

	generateLevel();

	createText();
	createHUD();

	game.input.keyboard.addCallbacks(this, gameScreenOnDown);
	game.add.audio('gamePlaySnd').play();
}

function createPlayer() {

	// Jugador
	player = game.add.sprite(levelConf.dimensions.width / 2, INITIAL_PLAYER_Y, 'playerAnimation');
	player.animations.add('stand', [0], 10, false);
	player.animations.add('jump', [1], 10, false);
	player.animations.play('stand');
	player.anchor.setTo(0.5, 0.5);
	player.scale.setTo(0.5, 0.5);
	game.physics.arcade.enable(player);

	player.body.gravity.y = PLAYER_GRAVITY;
	player.body.collideWorldBounds = true;
	player.body.bounce.y = 1;
	player.body.bounce.x = 0;

	player.body.checkCollision.up = false;

	
	

	game.camera.follow(player);

	let explosionAnimation = game.make.sprite(0, 0, 'explosionAnimation');
		explosionAnimation.animations.add('bye', [0,1,2,3,4], 6, false);
		explosionAnimation.anchor.setTo(0.5, 0.5);
		explosionAnimation.scale.setTo(1.5, 1.5);
		explosionAnimation.visible = false;
		explosionAnimation.events.onAnimationComplete.add(explosionAnimationFinished, this);

	let bunnyDead = game.make.sprite(0, 0, 'bunnyhurt');
		bunnyDead.anchor.setTo(0.5, 0.5);
		bunnyDead.visible = false;


	
	player.addChild(bunnyDead);
	player.addChild(explosionAnimation);
	

	controls = game.input.keyboard.createCursorKeys();
}


function generateLevel() {
	//levelConf.data

	platforms = game.add.group(); // Afegim un grup plataformes
	obstacles = game.add.group();
	enemies = game.add.group();
	game.physics.arcade.enable(platforms);
	game.physics.arcade.enable(obstacles);
	game.physics.arcade.enable(enemies);
	platforms.enableBody = true; // A ixe grup li habilitem el body per a les colisions
	obstacles.enableBody = true;
	enemies.enableBody = true;

	lifeSprites = game.add.group();

	let cubeScale = PLATFORM_WIDTH / game.cache.getImage('grass').width // widthQueVuic = widthReal * unaEscala // Totes les imatges de ground tenen les mateixes dimensions
	

	for (let nFloor = 0; nFloor < levelConf.data.length; nFloor++) {
		for (let nCube = 0; nCube < levelConf.data[nFloor].length; nCube++) {

			let cubeExists = levelConf.data[nFloor][nCube];
			let cubeX = PLATFORM_WIDTH * nCube;
			let cubeY = INITIAL_PLATFORM_Y + PLATFORM_GAP * nFloor;

			if (cubeExists == 1 && Math.random() > 0.5) { //Hay una probabilidad de 0.5 de que toque un bloque especial

			let nObstacles;

			if (levelToPlay > 1) {
				nObstacles = Math.floor(Math.random() * 8)
			} else {
				nObstacles = Math.floor(Math.random() * 5)
			}

				switch (nObstacles) {
					case 1:
						addCube(cubeX, cubeY, cubeScale, 'grass', 'cactus');
						break;
					case 2:
						addCube(cubeX, cubeY, cubeScale, 'grass_broken');
						break;
					case 3:
						addCube(cubeX, cubeY, cubeScale, 'grass', 'carrot');
						break;
					case 4:
						addCube(cubeX, cubeY, cubeScale, 'grass', 'spring');
						break;
					case 5:
						addCube(cubeX, cubeY, cubeScale, 'grass', 'letter');
						break;
					case 6:
						addCube(cubeX, cubeY, cubeScale, 'grass', 'flyMan');
						break;
					case 7:
						addCube(cubeX, cubeY, cubeScale, 'grass', 'carrotgold');
						break;
					default:
						addCube(cubeX, cubeY, cubeScale, 'grass');
						break;
				}
			} else if(cubeExists == 1) {
				addCube(cubeX, cubeY, cubeScale, 'grass');
			} else if (cubeExists == 3) {
				addCube(cubeX, cubeY, cubeScale, 'stone');
			}
		}
	}
}

function addCube(x, y, cubeScale, platformType, extra) {

	let cube = platforms.create(x , y, platformType); // Cube es una platform, eu pose aixina perq si pose platform se pot confundir en platforms #c
	cube.scale.setTo(cubeScale, cubeScale);
	//cube.anchor.setTo(0.5, 0.5);
	cube.body.immovable = true;
	cube.body.checkCollision.down = false;
	cube.body.checkCollision.right = false;
	cube.body.checkCollision.left = false;
	cube.type = platformType;

	if (extra == 'cactus') {
		let cactus = obstacles.create(x + PLATFORM_WIDTH / 2 , y, 'cactus');
		cactus.type = 'cactus'
		cactus.scale.setTo(cubeScale, cubeScale);
		cactus.anchor.setTo(0.5, 1);
		cactus.body.immovable = true;
		cactus.body.checkCollision.down = false;
		cube.type += '_cactus';
	} else if (extra == 'carrotgold') {
		let carrotgold = game.make.sprite(PLATFORM_WIDTH * 0.8, -10, 'carrot_gold');
		carrotgold.anchor.setTo(0.5, 1);

		cube.addChild(carrotgold);
		cube.type += '_carrotgold';

	} else if (extra == 'carrot') {
		let carrot = game.make.sprite(PLATFORM_WIDTH * 0.8, -10, 'carrot');
		carrot.anchor.setTo(0.5, 1);

		cube.addChild(carrot);
		cube.type += '_carrot';


	} else if (extra == 'letter') {

		// char = numero aleatori entre [65,90] el convertix a char (Tabla ASCII)
		let char = String.fromCharCode(Math.random() * (91 - 65) + 65);

		let cubeLetter = game.add.text(PLATFORM_WIDTH, -10, char, {font: 'Brightly', fontSize: '90pt', fontWeight: 'bold', fill: '#b60404'});
		cubeLetter.anchor.setTo(0.5, 1);
		cube.addChild(cubeLetter);
		cube.type += '_letter_' + char;
	} else if (extra == 'spring') {
		let spring = obstacles.create(x + PLATFORM_WIDTH / 2 , y, 'springAnimation');
		spring.animations.add('unused', [0], 10, false);
		spring.animations.add('used', [1], 10, false);
		spring.animations.play('unused');
		spring.type = 'spring';
		spring.scale.setTo(cubeScale, cubeScale);
		spring.anchor.setTo(0.5, 1);
		spring.body.immovable = true;
		spring.body.checkCollision.down = false;
		cube.type += '_spring';

	} else if (extra == 'flyMan') {
		let flyMan = obstacles.create(x + PLATFORM_WIDTH / 2 , y, 'flyManAnimation');
		flyMan.animations.add('stand', [0], 10 , false);
		flyMan.animations.add('fly', [1], 10, false);
		flyMan.animations.play('stand');
		flyMan.type = 'flyMan'
		flyMan.scale.setTo(cubeScale, cubeScale);
		flyMan.anchor.setTo(0.5, 1);
		flyMan.body.immovable = true;
		flyMan.body.checkCollision.down = false;
		flyMan.vel = 0;
		cube.type += '_flyMan';
	}

}

function createText() {

    let onGameTextStyle = {
        font: 'Brightly',
        fontSize: '23pt',
        fontWeight: 'bold',
        fill: '#b60404',
    };
	// Player name
    let nameText = game.add.text(0, 0, playerName.text, onGameTextStyle);
	nameText.fixedToCamera = true;
	nameText.cameraOffset.setTo(25, 25);

	// Remaining floors
	remainingFloorsText = game.add.text(0, 0, levelConf.data.length - 1, onGameTextStyle);
	remainingFloorsText.fixedToCamera = true;
	remainingFloorsText.cameraOffset.setTo(25, game.height - 75);

	// Level
	let levelText = game.add.text(0, 0, 'lvl: ' + levelToPlay, onGameTextStyle);
	levelText.fixedToCamera = true;
	levelText.cameraOffset.setTo(game.width - 140, game.height - 75);
}

function createHUD() {
	
	for (let i = 0; i < lifes; i++) {
		let lifeSprite = lifeSprites.create(game.width - 80 - i * 10, 25, 'life');
		lifeSprite.fixedToCamera = true;
	}

	powerupIcon = game.add.sprite(game.width - 250 , 30, 'carrot_gold');
	powerupIcon.visible = false;
	powerupIcon.scale.setTo(0.8, 0.8);
	powerupIcon.fixedToCamera = true;


	extraLife = game.add.sprite(game.width - 180 , 30, 'carrot');
	extraLife.visible = false;
	extraLife.scale.setTo(0.8, 0.8);
	extraLife.fixedToCamera = true;
}


//----PRELOAD--------------------------------------------------------------------------------------

function loadSprites() {
	game.load.image('player', 'assets/player/bunny1_stand.png'); // #c
	game.load.image('bunnyhurt', 'assets/backgrounds/gameOver/bunny2_hurt.png');

	game.load.spritesheet('explosionAnimation', 'assets/player/spritesheetExplosion.png', 192 , 192, 7);
	game.load.spritesheet('playerAnimation', 'assets/player/playerAnimation.png', 120, 207, 2);
	game.load.spritesheet('flyManAnimation', 'assets/objects/flyMan.png', 130, 148, 2);
	game.load.spritesheet('springAnimation', 'assets/objects/springAnimation.png', 145, 110, 2);

}

function loadImages() {
	game.load.image('grass', 'assets/objects/grass.png');
	game.load.image('grass_broken', 'assets/objects/grass_broken.png');
	game.load.image('stone', 'assets/objects/stone.png');
	game.load.image('cactus', 'assets/objects/cactus.png');
	game.load.image('life', 'assets/objects/life.png');
	game.load.image('carrot', 'assets/objects/carrot.png')
	game.load.image('carrot_gold', 'assets/objects/carrot_gold.png')



	game.load.image('bgGame', 'assets/backgrounds/infiniteBg.jpg');

}

function loadSounds() {
	game.load.audio('mainSnd', 'assets/snds/main.ogg');
	game.load.audio('gamePlaySnd', 'assets/snds/gameplay.ogg');
	game.load.audio('explosionSnd', 'assets/snds/explosion.ogg');
	game.load.audio('jumpSnd', 'assets/snds/jumping.ogg');
	game.load.audio('hitSnd', 'assets/snds/hurt1.ogg');
	game.load.audio('carrotSnd', 'assets/snds/carrot.ogg');
	game.load.audio('breakSnd', 'assets/snds/break.ogg');
}

function loadLevel(level) {
	game.load.text("currentLevel", pathToLevels + "lvl" + level + ".json", true);
}





//----OTHERS----------------------------------------------------------------------------

