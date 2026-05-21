class Thanks extends Phaser.Scene {
    constructor() {
        super("thanksScene");
    }

    create() {
        this.add.text(300, 400, 
            `   Wow that was a tough climb!\nPress SPACE to restart your journey`, 
            { font: "48px Arial", fill: "#ffffff" });

        
        this.spaceKey = this.input.keyboard.addKey('SPACE');
    }

    update() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.scene.start("platformerScene");
        }
    }
}