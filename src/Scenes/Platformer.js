class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 400;
        this.MAXSPEED = 300;
        this.DRAG = 500;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -600;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        
        this.CHECKPOINT = [0, 0]; 
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        // Create LAYERS
        this.bkgLayer = this.map.createLayer("Bkg", this.tileset, 0, 0);
        this.groundLayer = this.map.createLayer("Ground-n-Platforms", this.tileset, 0, 0);

        // Make it collidable
        this.groundLayer.setCollisionByProperty({
            collides: true
        });

        // Create coins from Objects layer in tilemap
        this.coins = this.map.createFromObjects("Objects", {
            name: "coin",
            key: "tilemap_sheet",
            frame: 151 //tile on tilesheet
        });

        this.playerSpawn = this.map.findObject("Objects", obj => obj.name === "playerSpawn");
        this.CHECKPOINT = [this.playerSpawn.x, this.playerSpawn.y];

        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the array this.coins
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);

        // Find water tiles
        this.waterTiles = this.groundLayer.filterTiles(tile => {
            return tile.properties.water == true;
        });

        ////////////////////
        // TODO: put water bubble particle effect here
        // It's OK to have it start running
        ////////////////////
        let waterVfx = this.add.particles(0, 0, "kenny-particles", {
            frame: "circle_01.png",
            scale: {min: 0.005, max: 0.015},

            //speedX: { min: -80, max: 80 },
            rotate: { min: 90, max : 100, start: 0, end: 360 * 2 },
            alpha: { min: 0.1, max: 0.9 },

            speedY: { min: -10, max: -20},
            //gravityY: 200,

            //color: [ 0xFF0000, 0x00FF00 ],
            lifespan: { min: 800, max: 1000 },
            emitZone: {
                type: 'random',
                source: new Phaser.Geom.Rectangle(163, 410, 105, 20)
            }
        });
       waterVfx.tint = 0xff0000;


        // set up player avatar
        my.sprite.player = this.physics.add.sprite(this.playerSpawn.x, this.playerSpawn.y, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(true);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);

        // TODO: create coin collect particle effect here
        // Important: make sure it's not running
        let coinVfx = this.add.particles(0, 0, "kenny-particles", {
            frame: "star_08.png",
            scale: { start: 0.06, end: 0.07 },
            scaleEase: "Cubic.easeIn",

            duration: 50,
            speedX: { min: -80, max: 80 },
            quantity: 10,
            rotate: { start:-90, end: 360 * 3 },
            alpha: { start: 0.1, end: 0.9 },
            alphaEase: "Cubic.easeOut",

            speedY: { min: 0, max: -120},
            gravityY: 200,
        });
        coinVfx.stop();


        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            obj2.destroy(); // remove coin on overlap
            ////////////////////
            // TODO: start the coin collect particle effect here
            ////////////////////
            coinVfx.x = my.sprite.player.x + 3;
            coinVfx.y = my.sprite.player.y - 10;

            coinVfx.start();
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');

        // debug key listener (assigned to D key)
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
            this.physics.world.debugGraphic.clear()
        }, this);

        // TODO: Add movement vfx here
        

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
        

    }

    update() {
        if(cursors.left.isDown) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here

        } else if(cursors.right.isDown) {
            my.sprite.player.setAccelerationX(this.ACCELERATION);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            my.sprite.player.anims.play('idle');
            // TODO: have the vfx stop playing
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!my.sprite.player.body.blocked.down) {
            my.sprite.player.anims.play('jump');
        }
        if(my.sprite.player.body.blocked.down && Phaser.Input.Keyboard.JustDown(cursors.up)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);
        }

        //restart input
        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            //this.scene.restart();
            this.resetPlayer();
        }
    }

    resetPlayer() {
        my.sprite.player.setPosition(this.CHECKPOINT[0], this.CHECKPOINT[1]);

        my.sprite.player.setVelocity(0, 0);
        my.sprite.player.setAcceleration(0, 0);
    }
}