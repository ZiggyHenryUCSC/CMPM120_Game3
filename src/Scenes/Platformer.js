class Platformer extends Phaser.Scene {
    constructor() {
        super("platformerScene");
    }

    init() {
        // variables and settings
        this.ACCELERATION = 500;
        this.MAXSPEED = 200;
        this.DRAG = 700;    // DRAG < ACCELERATION = icy slide
        this.physics.world.gravity.y = 1500;
        this.JUMP_VELOCITY = -500;
        this.PARTICLE_VELOCITY = 50;
        this.SCALE = 2.0;
        this.DASHPOWER = 400;
        this.AIRCONTROL = 0.5; // multiplier for horizontal control in the air (0 = no control, 1 = full control)
        
        this.CHECKPOINT = [0, 0]; 

        this.DASHENABLED = false; // whether player can dash, updated when they collect the diamond

        this.DISABLEMOVEMENT = false; // used for dramatic diamond pickup

        this.DASHES = 1; // number of dashes player has, reset on ground
        this.MAXDASHES = 1; // max number of dashes player can have
    }

    create() {
        // Create a new tilemap game object which uses 18x18 pixel tiles, and is
        // 45 tiles wide and 25 tiles tall.
        this.map = this.add.tilemap("platformer-level-1", 18, 18, 45, 25);

        // Add a tileset to the map
        // First parameter: name we gave the tileset in Tiled
        // Second parameter: key for the tilesheet (from this.load.image in Load.js)
        this.tileset = this.map.addTilesetImage("kenny_tilemap_packed", "tilemap_tiles");

        //paralax layers
        this.p2 = this.map.createLayer("p2", this.tileset, 0, 100);
        this.p2.setScrollFactor(0.5);
        this.p1 = this.map.createLayer("p1", this.tileset, 0, 0);
        this.p1.setScrollFactor(0.9);

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
        //add diamond to coins array so it can be handled by the same collision handler
        this.coins.push(...this.map.createFromObjects("Objects", {
            name: "diamond",
            key: "tilemap_sheet",
            frame: 67 //tile on tilesheet
        }));
        //add checkpoints to coins array so it can be handled by the same collision handler
        this.coins.push(...this.map.createFromObjects("Objects", {
            name: "checkpoint",
            key: "tilemap_sheet",
            frame: 112 //tile on tilesheet
        }));
        //add final checkpoint to coins array so it can be handled by the same collision handler
        this.coins.push(...this.map.createFromObjects("Objects", {
            name: "final checkpoint",
            key: "tilemap_sheet",
            frame: 111,
        }));


        // Create spikes from Objects layer in tilemap
        this.spikes = this.map.createFromObjects("Objects", {
            name: "spike",
            key: "tilemap_sheet",
            frame: 68 //tile on tilesheet
        });

        this.playerSpawn = this.map.findObject("Objects", obj => obj.name === "playerSpawn");
        this.CHECKPOINT = [this.playerSpawn.x, this.playerSpawn.y];

        //Enable physics on coins and spikes
        this.physics.world.enable(this.coins, Phaser.Physics.Arcade.STATIC_BODY);
        this.physics.world.enable(this.spikes, Phaser.Physics.Arcade.STATIC_BODY);

        // Create a Phaser group out of the arrays
        // This will be used for collision detection below.
        this.coinGroup = this.add.group(this.coins);
        this.spikeGroup = this.add.group(this.spikes);

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

       //dash text effect
        this.dashVfx = this.add.particles(100, 100, "dashText", {
            scale: { start: 0.18, end: 0.22 },

            //speedY: { min: -10, max: -20},
            maxAliveParticles: 1,
            lifespan: 10000,
        });
        this.dashVfx.stop();

        // set up player avatar
        my.sprite.player = this.physics.add.sprite(this.playerSpawn.x, this.playerSpawn.y, "platformer_characters", "tile_0000.png");
        my.sprite.player.setCollideWorldBounds(false);

        // Enable collision handling
        this.physics.add.collider(my.sprite.player, this.groundLayer);
        // vfx
        let coinVfx = this.add.particles(0, 0, "kenny-particles", {
            frame: "star_04.png",
            scale: { start: 0.06, end: 0.07 },
            scaleEase: "Cubic.easeOut",

            duration: 50,
            speedX: { min: -80, max: 80 },
            quantity: 10,
            rotate: { start:-90, end: 360 * 3 },
            alpha: { start: 1, end: 0 },
            alphaEase: "Cubic.easeOut",

            lifespan: 500,

            speedY: { min: 0, max: -120},
            gravityY: 200,
        });
        coinVfx.stop();

        this.coinVfx = coinVfx; // store in this so it can be accessed elsewhere

        this.jumpVfx = this.add.particles(0, 0, "kenny-particles", {
            frame: "smoke_03.png",
            scale: {min: 0.02, max: 0.05},

            alpha: { start: 0.9, end: 0 },
            alphaEase: "Cubic.easeOut",

            duration: 1,
            speedX: { min: -80, max: 80 },
            quantity: 10,
            //rotate: { start:-90, end: 360 * 3 },

            speedY: { min: 0, max: 20},
            gravityY: 10,
        });
        this.jumpVfx.stop();

        this.runVfx = this.add.particles(0, 0, "kenny-particles", {
            frame: "star_02.png",
            scale: {min: 0.02, max: 0.05},

            alpha: { start: 1, end: 0 },
            alphaEase: "Cubic.easeOut",

            duration: -1,
            speedX: { min: -80, max: 80 },
            quantity: 1,
            //rotate: { start:-90, end: 360 * 3 },
            frequency: 100,

            speedY: { min: 0, max: 20},
            gravityY: -20,

            lifespan: { min: 700, max: 1000 }
        });
        this.runVfx.stop();

        // Coin collision handler
        this.physics.add.overlap(my.sprite.player, this.coinGroup, (obj1, obj2) => {
            if (obj2.name === "diamond") {
                this.collectDiamond();

                
                this.sound.play("coin");
            }
            else if (obj2.name === "checkpoint") {
                let newCheckpoint = [obj2.x, obj2.y - obj2.height];
                if (this.CHECKPOINT[0] != newCheckpoint[0] || this.CHECKPOINT[1] != newCheckpoint[1]) {
                    this.CHECKPOINT = newCheckpoint;

                    this.coinVfx.x = my.sprite.player.x + 3;
                    this.coinVfx.y = my.sprite.player.y - 10;

                    this.coinVfx.start();

                    this.sound.play("coin");
                }

                return; // don't destroy checkpoint
            }
            else if (obj2.name === "final checkpoint") {
                this.endLevel();
            }
            
            obj2.destroy(); // remove coin on overlap
            ////////////////////
            // TODO: start the coin collect particle effect here
            ////////////////////


            coinVfx.x = my.sprite.player.x + 3;
            coinVfx.y = my.sprite.player.y - 10;

            coinVfx.start();
            
            this.sound.play("coin");
        });

        //spike collision handler
        this.physics.add.overlap(my.sprite.player, this.spikeGroup, (obj1, obj2) => {
            //half tile collision detection (vertically)
            if (my.sprite.player.y < obj2.y - obj2.height / 2) {
                return;
            }

            this.killPlayer();
        });

        // set up Phaser-provided cursor key input
        cursors = this.input.keyboard.createCursorKeys();

        this.rKey = this.input.keyboard.addKey('R');
        this.dKey = this.input.keyboard.addKey('D');
        this.aKey = this.input.keyboard.addKey('A');
        this.spaceKey = this.input.keyboard.addKey('SPACE');
        this.sKey = this.input.keyboard.addKey('S');

        // debug key listener (assigned to D key)
        // this.input.keyboard.on('keydown-D', () => {
        //     this.physics.world.drawDebug = this.physics.world.drawDebug ? false : true
        //     this.physics.world.debugGraphic.clear()
        // }, this);

        // TODO: Add movement vfx here
        

        // Simple camera to follow player
        this.cameras.main.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        this.cameras.main.startFollow(my.sprite.player, true, 0.25, 0.25); // (target, [,roundPixels][,lerpX][,lerpY])
        this.cameras.main.setDeadzone(50, 50);
        this.cameras.main.setZoom(this.SCALE);
    }

    update() {
        let grounded = my.sprite.player.body.blocked.down;
        let aircontrolMultiplier = grounded ? 1 : this.AIRCONTROL;

        if (my.sprite.player.y > this.map.heightInPixels) {
            this.killPlayer();
        }

        //dash input
        if (Phaser.Input.Keyboard.JustDown(this.sKey) && this.DASHENABLED
            && this.DASHES > 0) {
            if (this.DISABLEMOVEMENT) {
                this.DISABLEMOVEMENT = false;
                this.physics.world.gravity.y = this.cachedGravity;

                //TODO: hide text
                this.dashVfx.stop();
                this.dashVfx.killAll();
            }
            this.jumpVfx.x = my.sprite.player.x + 3;
            this.jumpVfx.y = my.sprite.player.y + 10;

            this.jumpVfx.start();

            this.DASHES--;
            
            my.sprite.player.setVelocityX((my.sprite.player.flipX ? 1 : -1) * this.DASHPOWER);
            my.sprite.player.setVelocityY(-this.DASHPOWER);
        }

        //PUT ALL NON-INPUT-RELATED UPDATES ABOVE THIS LINE (except for dash)

        if (this.DISABLEMOVEMENT) {
            return;
        }

        //PUT ALL PLAYER INPUT BELOW THIS LINE

        if((cursors.left.isDown || this.aKey.isDown)
            && my.sprite.player.body.velocity.x > -this.MAXSPEED) {
            my.sprite.player.setAccelerationX(-this.ACCELERATION * aircontrolMultiplier);
            my.sprite.player.resetFlip();
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            this.runVfx.x = my.sprite.player.x + 3;
            this.runVfx.y = my.sprite.player.y + 10;
            this.runVfx.start();

        } else if((cursors.right.isDown || this.dKey.isDown)
            && my.sprite.player.body.velocity.x < this.MAXSPEED) {
            my.sprite.player.setAccelerationX(this.ACCELERATION * aircontrolMultiplier);
            my.sprite.player.setFlip(true, false);
            my.sprite.player.anims.play('walk', true);
            // TODO: add particle following code here
            this.runVfx.x = my.sprite.player.x + 3;
            this.runVfx.y = my.sprite.player.y + 10;
            this.runVfx.start();

        } else {
            // Set acceleration to 0 and have DRAG take over
            my.sprite.player.setAccelerationX(0);
            my.sprite.player.setDragX(this.DRAG);
            if (this.abs(my.sprite.player.body.velocity.x) < 1) {
                my.sprite.player.anims.play('idle');
            }
            // TODO: have the vfx stop playing
            this.runVfx.stop();
        }

        // player jump
        // note that we need body.blocked rather than body.touching b/c the former applies to tilemap tiles and the latter to the "ground"
        if(!grounded) {
            my.sprite.player.anims.play('jump');
        } else {
            this.DASHES = this.MAXDASHES; // reset dashes when grounded
        }

        if(grounded && 
            (Phaser.Input.Keyboard.JustDown(this.spaceKey) || cursors.up.isDown)) {
            my.sprite.player.body.setVelocityY(this.JUMP_VELOCITY);

            this.jumpVfx.x = my.sprite.player.x + 3;
            this.jumpVfx.y = my.sprite.player.y + 10;

            this.jumpVfx.start();
        }

        //restart input
        if(Phaser.Input.Keyboard.JustDown(this.rKey)) {
            //this.scene.restart();

            //reset sfx??

            this.resetPlayer();
        }
    }

    abs(value) {
        return value < 0 ? -value : value;
    }

    killPlayer() {
        //kill sfx && vfx
        this.resetPlayer();
    }

    resetPlayer() {
        my.sprite.player.setPosition(this.CHECKPOINT[0], this.CHECKPOINT[1]);

        my.sprite.player.setVelocity(0, 0);
        my.sprite.player.setAcceleration(0, 0);
    }

    collectDiamond() {
        this.DASHENABLED = true;

        this.DISABLEMOVEMENT = true;

        this.cachedGravity = this.physics.world.gravity.y;
        this.physics.world.gravity.y = 0;

        my.sprite.player.setVelocity(0, 0);
        my.sprite.player.setAcceleration(0, 0);

        //show text
        this.dashVfx.x = my.sprite.player.x;
        this.dashVfx.y = my.sprite.player.y - my.sprite.player.height * 2;
        this.dashVfx.start();

        this.coinVfx.x = my.sprite.player.x + 3;
            this.coinVfx.y = my.sprite.player.y - 10;

            this.coinVfx.start();
    }

    endLevel()  {
        this.scene.start("thanksScene");
    }
}