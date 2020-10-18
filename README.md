Heximod
=======

**[`Hexi`](https://github.com/kittykatattack/hexi)** - fork, a portable design approach [ Hexi - mod - version ].

What's great about Heximod?

Here's core feature list:
-----------------------------------
- It is portable; works with any PIXI version and libraries independent.
- It contains only the core part of Hexi with some modification and added-injection functionality.
- All the Hexi's built-in modules[ i.e external libraries like; Bump, Tink, Charm, Sprite Utilities, ... ] are taken out.
And you can use that externally.
- Uses PIXI.Ticker as an update method.
- Keyboard response on iframe.
- Auto uploads textures to GPU.
- Built-in texture atlas support for the popular Texture Packer format.
- An optional load state that lets you run actions while assets are loading.
- Use addProperties method for Hexi's built-in feature; Conveniently position sprites relative to other sprites using putTop, putRight, putBottom, putLeft and putCenter. Align sprites horizontally or vertically using flowRight, flowLeft, flowUp or flowDown.

All the Hexi's core architecture documentation is still valid.
[`Checkout here`](https://github.com/kittykatattack/hexi)

<a id='quickstart'></a>
Quick start
----------------

The only file you need to start using Heximod is
[`heximod.min.js`](). It has an incredibly simple "installation": Just link it to an HTML page with a `<script>` tag. Then link your main JavaScript file that will contain your game or application code. Here's what a typical Hexi HTML container page might look like:
```html
<!doctype html>
<meta charset="utf-8">
<title>Hexi</title>
<body>
<!-- Pixi renderer, Heximod, and game script  -->
<script src="pixi.js"></script>
<script src="heximod.min.js"></script>
<script src="main.js"></script>
</body>
```
<a id='heximodsarchitecture'></a>
### Architecture

1. Start Heximod.
2. The `load` function, that will run while your files are loading.
3. The `setup` function, which initializes your game objects, variables and sprites.
4. The `play` function, which is your game or application logic that runs in a loop.

And Here's what this actually looks like in real code:

```js
//1. Setting up and starting Hexi

//Initialize and start Heximod
let g = heximod(
    //An advantage to doing this is that it lets you use your own custom build of Pixi, or a
    //specific version of Pixi that you want to use.
    PIXI,
    {
        pixiSettings:{
            // All the PIXI.Application (options) are valid
            width: 550,
            height: 400
            // Optional, Provide view-container; i.e canvas to append inside
            // viewContainer: document.getElementById("gameContainer")
        },
        assets: [
            //An array of files you want to load
            "images/cat.png",
            "maps/level.json",
            "images/sprites.json",
            "fonts/puzzler.ttf",
            "sounds/music.mp3"
        ],
        setup,
        // Optional
        load
});
g.start();

// Optional
// Initialize all the helper modules / external libraries, so that it can be access through top-level reference.
g.injectSystem(function (sys) {
    // - [Bump](https://github.com/kittykatattack/bump):
    sys.bump = new Bump(PIXI);
    // - [Tink](https://github.com/kittykatattack/tink):
    sys.tink = new Tink(PIXI, sys.canvas);
    // - [Sprite Utilities](https://github.com/kittykatattack/spriteUtilities):
    sys.spriteFx = new SpriteUtilities(PIXI);
    // - [Tile Utilities](https://github.com/kittykatattack/tileUtilities):
    sys.tiles = new TileUtilities(PIXI);
    // - [Game Utilities](https://github.com/kittykatattack/gameUtilities):
    sys.gameFx = new GameUtilities();
});

// Optional, a root update method
g.systemUpdate = (data) => {
    g.spriteFx.update();
    g.tink.update();
};

// Optional, middleware on injectValidateAssets
g.injectValidateAssets(callback) {
    // Perform specific task, like custom sound loading.
    return true;
};

//2. Optional, The `load` function that will run while your files are loading

function load(){}

//3. The `setup` function, which initializes your game objects, variables and sprites

function setup() {

  //Create your game objects here

  let sprite = new PIXI.Sprite("player.png");
  // Add to gameStage
  g.gameStage.addChild(sprite);
  // Use addProperties method to access Hexi's sprite built-in feature
  g.addProperties(sprite);

  //Set the game state to `play` to start the game loop
  g.state = play;
}

//4. The `play` function, which is your game or application logic that runs in a loop

function play(data){
  //This is your game loop, where you can move sprites and add your
  //game logic
}
```


<a id='takingitfurther'></a>
### Taking it further

For manual build:
- Clone Repo.
- Install node.
- Open terminal/cmd, Run [`npm install`]() in root directory.
- And do [`npm run build`]().
- Built files will be in dir folder