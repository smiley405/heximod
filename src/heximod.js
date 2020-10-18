/*
Heximod
====

Welcome to Heximod's source code!
*/

//1. SETUP AND INSTANTIATION
//---------------------------

//IMPORTANT: Make sure to load Pixi and the modules before instantiating Hexi!

//The high level `hexi` function lets you quickly create an instance
//of Hexi using sensible defaults.
function heximod(pixi, o) {
  let hexi = new Hexi(
    // specific version of Pixi that you want to use.
    PIXI,
    {
      // All the PIXI.Application (options) are valid
      pixiSettings: o.pixiSettings,
      setup: o.setup,
      assets: o.assets,
      load: o.load
  });
  return hexi;
}

//2. THE HEXI CLASS CONSTRUCTOR
//----------------------------

class Hexi {

  /*
  Initialize Hexi's constructor with an options object literal called `o`.
  Here are the required options:
  */
  constructor(pixi, o) {
    //Create local aliases for the important methods and properties of
    //these libraries, including the most useful Pixi properties.
    //Take a look at Hexi's `createModulePropertyAliases` method in the
    //source code ahead to see how this works
    this.createModulePropertyAliases(pixi);

    //Create the stage and renderer
    this.app = new this.pixi.Application(o.pixiSettings);

    //Get a reference to the `renderer.view`, which is the
    //HTML canvas element
    this.canvas = this.app.view;

    //Add `halfWidth` and `halfHeight` properties to the canvas
    Object.defineProperties.bind(this, this.canvas, {
      "halfWidth": {
        get() {
          return this.canvas.width / 2
        },
        enumerable: true,
        configurable: true
      },
      "halfHeight": {
        get() {
          return this.canvas.height / 2
        },
        enumerable: true,
        configurable: true
      }
    });

    //A Boolean to flag whether the canvas has been scaled
    this.canvas.scaled = false;

    //Set the canvas's optional background color and border style
    if (o.border) this.canvas.style.border = o.border;

    if ( o.pixiSettings.viewContainer ) {
      o.pixiSettings.viewContainer.appendChild(this.canvas);
    } else {
      document.body.appendChild(this.canvas);
    }

    //Create a container object called the `stage`
    this.gameStage = new this.Container();
    this.app.stage.addChild(this.gameStage);

    //Add Hexi's special sprite properties to the stage
    this.addProperties(this.gameStage);
    this.gameStage._stage = true;

    //Set the game `state`
    this.state = undefined;

    //Set the user-defined `load` and `setup` states
    if (o.load !== undefined) this.loadState = o.load;

    //The `setup` function is required, so throw an error if it's
    //missing
    if (!o.setup) {
      throw new Error(
        "Please supply the setup option in the constructor to tell Hexi which function should run first when it starts."
      );
    } else {
      this.setupState = o.setup;
    }

    //A variable to track the current percentage of loading assets
    this.loadingProgress = 0;

    //A variable to track the currently loading asset
    this.loadingFile = "";

    //Load any assets if they've been provided
    if (o.assets !== undefined) {
      this.assetsToLoad = o.assets;
    }

    //Tell Hexi that we're not using a loading progress bar.
    //(This will be set to `true` if the user invokes the `loadingBar`
    //function, which you'll see ahead)
    this._progressBarAdded = false;

    //The `soundObjects` object is used to store all sounds
    this.soundObjects = {};

    this.app.ticker.add((data) => {
      this.update(data);
    });

    this.responseIframe();
  }

  //3. HEXI'S ENGINE: START, LOAD AND SETUP
  //---------------------------------------

  //The `start` method must be called by the user after Hexi has been
  //initialized to start the loading process and turn on the engine.
  start() {

    //If there are assets to load, load them, and set the game's state
    //to the user-defined `loadState` (which can be supplied by the user in the
    //constructor)
    if (this.assetsToLoad) {

      //Call Hexi's `load` method (ahead) to load the assets
      this.load(this.assetsToLoad, this.validateAssets);

      //After the assets have been loaded, a method called
      //`validateAssets` will run (see `validateAssets` ahead.)
      //`validateAssets` checks to see what has been loaded and,
      //in the case of sound files, decodes them and creates sound
      //objects.

      //If the user has supplied Hexi with a `load` function (in
      //Hexi's constructor), it will be assigned to Hexi's current
      //`state` and, as you'll see ahead, called in a loop while the
      //assets load
      if (this.loadState) this.state = this.loadState;
    } else {

      //If there's nothing to load, run the `setup` state, which will
      //just run once
      this.setupState();
    }

  }

  //Use the `load` method to load any files into Hexi. Pass it a
  //callback function as the second argument to launch a function that
  //should run when all the assets have finished loading. Hexi's
  //default callback function is `validateAssets`, which you'll find
  //in the code ahead
  load(assetsToLoad, callbackFunction = undefined) {

    //Handle special file types that Pixi's loader doesn't understand
    //The `findAssets` function will return an array to get an array just
    //containing those file source paths you're interested in
    let findAssets = fileExtensionArray => {
      let fileSourcePaths = assetsToLoad.filter(source => {

        //Find the file extension of the asset
        let extension = source.split(".").pop();
        if (fileExtensionArray.indexOf(extension) !== -1) {
          return true;
        }
      });

      return fileSourcePaths;
    };

    /* Load fonts */

    //First, define the file extensions for the special file types
    //you're interested in
    //Fonts

    //Get the font source paths
    let fontFiles = findAssets(this.grabEntensions("font"));

    //If there are any font files, load them into the browser using an
    //old trick that forces the browser to load them
    if (fontFiles.length > 0) {
      this.spanElements = [];
      fontFiles.forEach(source => {

        //Loads the font files by writing CSS code to the HTML document head.
        //Use the font's filename as the `fontFamily` name. This code captures
        //the font file's name without the extension or file path
        let fontFamily = source.split("/").pop().split(".")[0];

        //Push the font family name into Hexi's `fontFamilies` array
        if (this.fontFamilies) this.fontFamilies.push(fontFamily);

        //Append an `@afont-face` style rule to the head of the HTML document
        let newStyle = document.createElement("style");
        let fontFace = "@font-face {font-family: '" + fontFamily + "'; src: url('" + source + "');}";
        newStyle.appendChild(document.createTextNode(fontFace));
        document.head.appendChild(newStyle);

        //Trick the browser into loading the font file by
        //displaying an invisible element
        let span = document.createElement("span");
        span.style.fontFamily = fontFamily;
        document.body.appendChild(span);
        span.innerHTML = "?";
        span.style.display = "block";
        span.style.opacity = "0";
        this.spanElements.push(span);
      });
    }

    /* Load sound */

    this.grabEntensions("sound").forEach(extension => {
      //Set default loading mechanism for sound file extensions to use XHR
      this.loaderResource.setExtensionLoadType(extension, this.loaderResource.LOAD_TYPE.XHR);
      //Set default loading type for sound file extensions to be arraybuffer
      this.loaderResource.setExtensionXhrType(extension, this.loaderResource.XHR_RESPONSE_TYPE.BUFFER);

    });

    /* Load ordinary assets */
    let loadProgressHandler = (loader, resource) => {
      //Display the file `url` currently being loaded
      this.loadingFile = resource.url;

      //Display the percentage of files currently loaded
      this.loadingProgress = loader.progress;

      this.loadingBar();
    };

    //Load the files and call the `loadProgressHandler` while they're
    //loading
    this.loader.reset();
    this.loadingProgress = 0;
    this.loadingFile = "";
    this.loader
      .add(assetsToLoad)
      .load(callbackFunction.bind(this));
    this.loader.onLoad.add(loadProgressHandler); // called once per loaded file
  }

  uploadToGPU() {
    const textures = this.pixi.utils.TextureCache;
    for (const key in textures) {
      this.app.renderer.plugins.prepare.upload(textures[key]);
    }
  }

  //The `validateAssets` method runs when all the assets have finished
  //loading. It checks to see if there are any sounds files and, if
  //there are, decodes them and turns them into sound objects using the
  //`sounds.js` module's `makeSound` function. If there are no sounds
  //to load, the loading state is finished and the setup state is run.
  //But, if there are sounds to load, the setup state will only run
  //after the sounds have been decoded.
  validateAssets() {
    console.log("All assets loaded");

    //The `finishLoadingState` method will be called if everything has
    //finished loading and any possible sounds have been decoded
    let finishLoadingState = () => {

      //Reset the `assetsToLoad` array
      this.assetsToLoad = [];

      //Clear the `loadState`
      this.loadState = undefined;

      //Clear the game `state` function for now to stop the loop.
      this.state = undefined;

      //Remove the loading progress bar if the user invoked the `loadingBar`
      //function
      if (this._progressBarAdded) {
        this.progressBar.remove();
      }

      //If any fonts were tricked into loading
      //make the <span> tags that use them invisible
      if (this.spanElements) {
        this.spanElements.forEach(element => {
          element.style.display = "none";
        });
      }

      this.uploadToGPU();

      //Call the `setup` state
      this.setupState();
    };

    // do middleware things inside injectValidateAssets function and return true at the end
    if ( !this.injectValidateAssets(finishLoadingState) ) {
      finishLoadingState();
    }
   
  }

  //The `update` method is run by Hexi's game loop each frame.
  //It manages the game state and updates the modules
  update(data) {

    //Update all the modules in the `modulesToUpdate` array.
    //These are modules that contain `update` methods that need to be
    //called every frame
    this.systemUpdate(data);

    //Run the current game `state` function if it's been defined and
    //the game isn't `paused`
    if (this.state && !this.paused) {
      this.state(data);
    }
  }

  // middleware system update function 
  systemUpdate(data) {}

  //Pause and resume methods
  pause() {
    this.paused = true;
  }
  resume() {
    this.paused = false;
  }

  grabEntensions(name) {
    switch (name) {
      case "font":
        return ["ttf", "otf", "ttc", "woff"];

      case "sound":
        return ["wav", "mp3", "ogg", "webm"];
    }
  }

  // call this function to make an aliases with system
  injectSystem(injectFunction) {
    if (injectFunction) {
      injectFunction(this);
    }
  }

  // middleware on validateAssets, return true at the end (mandatory)
  injectValidateAssets(finishLoadingState) {}

  //4. MODULE INTERFACES

  //A method that helpfully creates local, top-level references to the
  //most useful properties and methods from the loaded modules
  createModulePropertyAliases(pixi) {

    //Pixi - Rendering
    this.pixi = pixi;
    this.Container = this.pixi.Container;
    this.loader = this.pixi.Loader ? this.pixi.Loader.shared : this.pixi.loader;
    this.loaderResource = this.pixi.LoaderResource ? this.pixi.LoaderResource : this.pixi.loaders.Resource;
    this.TextureCache = this.pixi.utils.TextureCache;
    this.filters = this.pixi.filters;

    this.injectSystem();
  }

  //Getters and setters

  //Pixi's loader resources
  get resources() {
    return this.app.loader.resources;
  }

  //The `border` property lets you set the border style on the canvas
  set border(value) {
    this.canvas.style.border = value;
  }

  //The flow methods: `flowRight`, `flowDown`, `flowLeft` and
  //`flowUp`.
  //Use them to easily align a row of sprites horizontally or
  //vertically. The flow methods take two arguments: the padding (in
  //pixels) between the sprites, and list of sprites (or an array
  //containing sprites) that you want to align.
  //(This feature was inspired by the Elm programming language)

  //flowRight
  flowRight(padding, ...sprites) {

    //A function to flow the sprites
    let flowSprites = (spritesToFlow) => {
      if (spritesToFlow.length > 0) {
        for (let i = 0; i < spritesToFlow.length - 1; i++) {
          let sprite = spritesToFlow[i];
          sprite.putRight(spritesToFlow[i + 1], +padding);
        }
      }
    };

    //Check if `sprites` is a an array of sprites, or an
    //array containing sprite objects
    if (!(sprites[0] instanceof Array)) {

      //It's an array of sprites
      flowSprites(sprites);
    } else {

      //It's an array containing sprite objects
      let spritesArray = sprites[0];
      flowSprites(spritesArray);
    }
  }

  //flowDown
  flowDown(padding, ...sprites) {
    let flowSprites = (spritesToFlow) => {
      if (spritesToFlow.length > 0) {
        for (let i = 0; i < spritesToFlow.length - 1; i++) {
          let sprite = spritesToFlow[i];
          sprite.putBottom(spritesToFlow[i + 1], 0, +padding);
        }
      }
    };
    if (!(sprites[0] instanceof Array)) {
      flowSprites(sprites);
    } else {
      let spritesArray = sprites[0];
      flowSprites(spritesArray);
    }
  }

  //flowLeft
  flowLeft(padding, ...sprites) {
    let flowSprites = (spritesToFlow) => {
      if (spritesToFlow.length > 0) {
        for (let i = 0; i < spritesToFlow.length - 1; i++) {
          let sprite = spritesToFlow[i];
          sprite.putLeft(spritesToFlow[i + 1], -padding);
        }
      }
    };
    if (!(sprites[0] instanceof Array)) {
      flowSprites(sprites);
    } else {
      let spritesArray = sprites[0];
      flowSprites(spritesArray);
    }
  }

  //flowUp
  flowUp(padding, ...sprites) {
    let flowSprites = (spritesToFlow) => {
      if (spritesToFlow.length > 0) {
        for (let i = 0; i < spritesToFlow.length - 1; i++) {
          let sprite = spritesToFlow[i];
          sprite.putTop(spritesToFlow[i + 1], 0, -padding);
        }
      }
    };
    if (!(sprites[0] instanceof Array)) {
      flowSprites(sprites);
    } else {
      let spritesArray = sprites[0];
      flowSprites(spritesArray);
    }
  }

  //7. SPRITE PROPERTIES

  //The sprite creation methods above all run the `addProperties`
  //method on each sprite they create. `addProperties` adds special
  //properties and methods (super powers!) to Hexi sprites.

  addProperties(...displayObjects) {
    displayObjects.forEach(o => {
      //Velocity
      o.vx = 0;
      o.vy = 0;
      // acceleration
      o.accel = {x: 0, y: 0};
      o.health = 100;
      o.killed = false;

      //A "private" `_layer` property
      o._layer = 0;

      //Is the sprite circular? If it is, it will be given a `radius`
      //and `diameter`
      o._circular = false;

      //Is the sprite interactive? Setting this to `true` makes the
      //sprite behave like a button
      o._interact = false;

      //Is the sprite draggable?
      o._draggable = false;

      //Flag this object for compatibility with the Bump collision
      //library
      o._bumpPropertiesAdded = true;

      //Swap the depth layer positions of two child sprites
      o.swapChildren = (child1, child2) => {
        let index1 = o.children.indexOf(child1),
          index2 = o.children.indexOf(child2);
        if (index1 !== -1 && index2 !== -1) {

          //Swap the indexes
          child1.childIndex = index2;
          child2.childIndex = index1;

          //Swap the array positions
          o.children[index1] = child2;
          o.children[index2] = child1;
        } else {
          throw new Error(child + " Both objects must be a child of the caller " + o);
        }
      };

      //`add` and `remove` convenience methods let you add and remove
      //many sprites at the same time.
      o.add = (...sprites) => {
        if (sprites.length > 1) {
          sprites.forEach(sprite => o.addChild(sprite));
        } else {
          o.addChild(sprites[0]);
        }
      };
      o.remove = (...sprites) => {
        if (sprites.length > 1) {
          sprites.forEach(sprite => o.removeChild(sprite));
        } else {
          o.removeChild(sprites[0]);
        }
      };

      //The `put` methods are conveniences that help you position a
      //another sprite in and around this sprite.
      //First, get a short form reference to the sprite to make the code
      //easier to read
      let a = o;

      //The `nudgeAnchor`, `compensateForAnchor` and
      //`compensateForAnchors` (with an "s"!) methods are used by
      //the `put` methods to adjust the position of the sprite based on
      //its x/y anchor point.
      let nudgeAnchor = (o, value, axis) => {
        if (o.anchor !== undefined) {
          if (o.anchor[axis] !== 0) {
            return value * ((1 - o.anchor[axis]) - o.anchor[axis]);
          } else {
            return value;
          }
        } else {
          return value;
        }
      };

      let compensateForAnchor = (o, value, axis) => {
        if (o.anchor !== undefined) {
          if (o.anchor[axis] !== 0) {
            return value * o.anchor[axis];
          } else {
            return 0;
          }
        } else {
          return 0;
        }
      };

      let compensateForAnchors = (a, b, property1, property2) => {
        return compensateForAnchor(a, a[property1], property2) + compensateForAnchor(b, b[property1], property2)
      };

      //The `put` methods:
      //Center a sprite inside this sprite. `xOffset` and `yOffset`
      //arguments determine by how much the other sprite's position
      //should be offset from the center. These methods use the
      //sprites' global coordinates (`gx` and `gy`).
      //In all these functions, `b` is the second sprite that is being
      //positioned relative to the first sprite (this one), `a`.
      //Center `b` inside `a`.
      o.putCenter = (b, xOffset = 0, yOffset = 0) => {
        if (o._stage) a = this.compensateForStageSize(o);
        //b.x = (a.x + a.halfWidth - (b.halfWidth * ((1 - b.anchor.x) - b.anchor.x))) + xOffset;
        b.x = (a.x + nudgeAnchor(a, a.halfWidth, "x") - nudgeAnchor(b, b.halfWidth, "x")) + xOffset;
        b.y = (a.y + nudgeAnchor(a, a.halfHeight, "y") - nudgeAnchor(b, b.halfHeight, "y")) + yOffset;

        //Compensate for the parent's position
        if (!o._stage) o.compensateForParentPosition(a, b);
      };

      //Position `b` to the left of `a`.
      o.putLeft = (b, xOffset = 0, yOffset = 0) => {
        if (o._stage) a = this.compensateForStageSize(o);
        b.x = (a.x - nudgeAnchor(b, b.width, "x")) + xOffset - compensateForAnchors(a, b, "width", "x");
        b.y = (a.y + nudgeAnchor(a, a.halfHeight, "y") - nudgeAnchor(b, b.halfHeight, "y")) + yOffset;

        //Compensate for the parent's position
        if (!o._stage) o.compensateForParentPosition(a, b);
      };

      //Position `b` above `a`.
      o.putTop = (b, xOffset = 0, yOffset = 0) => {
        if (o._stage) a = this.compensateForStageSize(o);
        b.x = (a.x + nudgeAnchor(a, a.halfWidth, "x") - nudgeAnchor(b, b.halfWidth, "x")) + xOffset;
        b.y = (a.y - nudgeAnchor(b, b.height, "y")) + yOffset - compensateForAnchors(a, b, "height", "y");

        //Compensate for the parent's position
        if (!o._stage) o.compensateForParentPosition(a, b);
      };

      //Position `b` to the right of `a`.
      o.putRight = (b, xOffset = 0, yOffset = 0) => {
        if (o._stage) a = this.compensateForStageSize(o);
        b.x = (a.x + nudgeAnchor(a, a.width, "x")) + xOffset + compensateForAnchors(a, b, "width", "x");
        b.y = (a.y + nudgeAnchor(a, a.halfHeight, "y") - nudgeAnchor(b, b.halfHeight, "y")) + yOffset;
        //b.x = (a.x + a.width) + xOffset;
        //b.y = (a.y + a.halfHeight - b.halfHeight) + yOffset;

        //Compensate for the parent's position
        if (!o._stage) o.compensateForParentPosition(a, b);
      };

      //Position `b` below `a`.
      o.putBottom = (b, xOffset = 0, yOffset = 0) => {
        if (o._stage) a = this.compensateForStageSize(o);
        //b.x = (a.x + a.halfWidth - b.halfWidth) + xOffset;
        b.x = (a.x + nudgeAnchor(a, a.halfWidth, "x") - nudgeAnchor(b, b.halfWidth, "x")) + xOffset;
        //b.y = (a.y + a.height) + yOffset;
        b.y = (a.y + nudgeAnchor(a, a.height, "y")) + yOffset + compensateForAnchors(a, b, "height", "y");

        //Compensate for the parent's position
        if (!o._stage) o.compensateForParentPosition(a, b);
      };

      //`compensateForParentPosition` is a helper function for the above
      //`put` methods that subracts the parent's global position from
      //the nested child's position.
      o.compensateForParentPosition = (a, b) => {
        if (b.parent.gx !== 0 || b.parent.gy !== 0) {
          b.x -= a.gx;
          b.y -= a.gy;
        }
      };

      Object.defineProperties(o, {
        "gx": {
          get() {
            return o.getGlobalPosition().x
          },
          enumerable: true,
          configurable: true
        },
        "gy": {
          get() {
            return o.getGlobalPosition().y
          },
          enumerable: true,
          configurable: true
        },
        "centerX": {
          get() {
            return o.x + (o.width / 2) - o.xAnchorOffset
          },
          enumerable: true,
          configurable: true
        },
        "centerY": {
          get() {
            return o.y + (o.height / 2) - o.yAnchorOffset
          },
          enumerable: true,
          configurable: true
        },
        "halfWidth": {
          get() {
            return o.width / 2
          },
          enumerable: true,
          configurable: true
        },
        "halfHeight": {
          get() {
            return o.height / 2
          },
          enumerable: true,
          configurable: true
        },
        "scaleModeNearest": {
          set(value) {
            if (o.texture.baseTexture) {
              if (value) {
                o.texture.baseTexture.scaleMode = this.pixi.SCALE_MODES.NEAREST;
              } else {
                o.texture.baseTexture.scaleMode = this.pixi.SCALE_MODES.LINEAR;
              }
            } else {
              throw new Error(`The scale mode of ${o} cannot be modified`)
            }
          },
          enumerable: true,
          configurable: true
        },
        "pivotX": {
          get() {
            return o.anchor.x
          },
          set(value) {
            if (o.anchor === undefined) {
              throw new Error(`${o} does not have a PivotX value`);
            }
            o.anchor.x = value;
            if (!o._previousPivotX) {
              o.x += value * o.width;
            } else {
              o.x += (value - o._previousPivotX) * o.width;
            }
            o._previousPivotX = value;
          },
          enumerable: true,
          configurable: true
        },
        "pivotY": {
          get() {
            return o.anchor.y
          },
          set(value) {
            if (o.anchor === undefined) {
              throw new Error(`${o} does not have a PivotY value`);
            }
            o.anchor.y = value;
            if (!o._previousPivotY) {
              o.y += value * o.height;
            } else {
              o.y += (value - o._previousPivotY) * o.height;
            }
            o._previousPivotY = value;
          },
          enumerable: true,
          configurable: true
        },
        "xAnchorOffset": {
          get() {
            if (o.anchor !== undefined) {
              return o.height * o.anchor.x;
            } else {
              return 0;
            }
          },
          enumerable: true,
          configurable: true
        },
        "yAnchorOffset": {
          get() {
            if (o.anchor !== undefined) {
              return o.width * o.anchor.y;
            } else {
              return 0;
            }
          },
          enumerable: true,
          configurable: true
        },
        "scaleX": {
          get() {
            return o.scale.x
          },
          set(value) {
            o.scale.x = value;
          },
          enumerable: true,
          configurable: true
        },
        "scaleY": {
          get() {
            return o.scale.y
          },
          set(value) {
            o.scale.y = value;
          },
          enumerable: true,
          configurable: true
        },

        //Depth layer
        "layer": {
          get() {
            return o._layer
          },
          set(value) {
            o._layer = value;
            if (o.parent) {

              //Sort the sprite’s parent’s `children` array so that sprites with a
              //higher `layer` value are moved to the end of the array
              o.parent.children.sort((a, b) => a.layer - b.layer);
            }
          },
          enumerable: true,
          configurable: true
        },

        //The `localBounds` and `globalBounds` methods return an object
        //with `x`, `y`, `width`, and `height` properties that define
        //the dimensions and position of the sprite. This is a convenience
        //to help you set or test boundaries without having to know
        //these numbers or request them specifically in your code.
        "localBounds": {
          get() {
            return {
              x: 0,
              y: 0,
              width: o.width,
              height: o.height
            };
          },
          enumerable: true,
          configurable: true
        },
        "globalBounds": {
          get() {
            return {
              x: o.gx,
              y: o.gy,
              width: o.gx + o.width,
              height: o.gy + o.height
            };
          },
          enumerable: true,
          configurable: true
        },

        //`empty` is a convenience property that will return `true` or
        //`false` depending on whether or not this sprite's `children`
        //array is empty
        "empty": {
          get() {
            if (o.children.length === 0) {
              return true;
            } else {
              return false;
            }
          },
          enumerable: true,
          configurable: true
        },

        //The `circular` property lets you define whether a sprite
        //should be interpreted as a circular object. If you set
        //`circular` to `true`, the sprite is given `radius` and `diameter`
        //properties. If you set `circular` to `false`, the `radius`
        //and `diameter` properties are deleted from the sprite
        "circular": {
          get() {
            return o._circular;
          },
          set(value) {

            //Give the sprite `diameter` and `radius` properties
            //if `circular` is `true`
            if (value === true && o._circular === false) {
              Object.defineProperties(o, {
                "diameter": {
                  get() {
                    return o.width;
                  },
                  set(value) {
                    o.width = value;
                    o.height = value;
                  },
                  enumerable: true,
                  configurable: true
                },
                "radius": {
                  get() {
                    return o.halfWidth;
                  },
                  set(value) {
                    o.width = value * 2;
                    o.height = value * 2;
                  },
                  enumerable: true,
                  configurable: true
                }
              });

              //Set o.sprite's `_circular` property to `true`
              o._circular = true;
            }

            //Remove the sprite's `diameter` and `radius` properties
            //if `circular` is `false`
            if (value === false && o._circular === true) {
              delete o.diameter;
              delete o.radius;
              o._circular = false;
            }
          },
          enumerable: true,
          configurable: true
        }
      });

      //A `setPosition` convenience method to let you set the
      //x any y position of a sprite with one line of code.
      o.setPosition = (x, y) => {
        o.x = x;
        o.y = y;
      };

      //A similar `setScale` convenience method
      o.setScale = (xScale, yScale) => {
        o.scale.x = xScale;
        o.scale.y = yScale;
      };

      //And a matching `setPivot` method
      o.setPivot = (xPivot, yPivot) => {
        o.pivotX = xPivot;
        o.pivotY = yPivot;
      };

      if (o.circular) {
        Object.defineProperty(o, "radius", {
          get() {
            return o.width / 2;
          },
          enumerable: true,
          configurable: true
        });
      }
    });
    
  }

  //8. Utilities

  //`log` is a shortcut for `console.log`, so that you have less to
  //type when you're debugging
  log(value) {
    return console.log(value);
  }

  //The `makeProgressBar` method creates a `progressBar` object with
  //`create`, `update` and `remove` methods. It's called by the
  //`loadingBar` method, which should be run inside the `load`
  //function of your application code.
  makeProgressBar() {
    //The `progressBar` object
    let pb = {
      maxWidth: 0,
      height: 0,
      backgroundColor: "0x808080",
      foregroundColor: "0x00FFFF",
      container: null,
      backBar: null,
      frontBar: null,
      percentage: null,
      assets: null,
      initialized: false
    };

    //Use the `create` method to create the progress bar
    pb.create = () => {

      //Set the maximum width to half the width of the canvas
      pb.maxWidth = this.canvas.width / 2;

      //Build the progress bar using two rectangle sprites and
      //one text sprite

      pb.container = new this.pixi.Container();
      //1. Create the background bar's gray background
      pb.backBar = new this.pixi.Graphics();
      pb.backBar.beginFill(pb.backgroundColor);
      pb.backBar.drawRect(0, 0, pb.maxWidth, 32);
      pb.backBar.x = (this.canvas.width / 2) - (pb.maxWidth / 2);
      pb.backBar.y = (this.canvas.height / 2) - 16;

      //2. Create the blue foreground bar. This is the element of the
      //progress bar that will increase in width as assets load
      pb.frontBar = new this.pixi.Graphics();
      pb.frontBar.drawRect(0, 0, pb.maxWidth, 32);
      pb.frontBar.x = (this.canvas.width / 2) - (pb.maxWidth / 2);
      pb.frontBar.y = (this.canvas.height / 2) - 16;

      //3. A text sprite that will display the percentage
      //of assets that have loaded
      pb.percentage = new this.pixi.Text("0%", new this.pixi.TextStyle({
        fontFamily: 'sans-serif',
        fontSize: 28,
        fill: ["black"]
      }));
      pb.percentage.x = (this.canvas.width / 2) - (pb.maxWidth / 2) + 12;
      pb.percentage.y = (this.canvas.height / 2) - 17;

      pb.container.addChild(pb.backBar, pb.frontBar, pb.percentage);
      this.gameStage.addChild(pb.container);
    };

    //Use the `update` method to update the width of the bar and
    //percentage loaded each frame
    pb.update = () => {

      //Change the width of the blue `frontBar` to match the
      //ratio of assets that have loaded.
      let ratio = this.loadingProgress / 100;
      //console.log(`ratio: ${ratio}`);
      pb.frontBar.width = pb.maxWidth * ratio;

      //Display the percentage
      pb.percentage.text = `${Math.round(this.loadingProgress)} %`;
    };

    //Use the `remove` method to remove the progress bar when all the
    //game assets have finished loading
    pb.remove = () => {
      //Remove the progress bar using the universal sprite `remove`
      //function
      this.gameStage.removeChild(pb.container);
    }

    return pb;
  }

  //The `loadingBar` method should be called inside the user-definable
  //`load` method in the application code. This function will run in a
  //loop. It will create the loading bar, and then call the loading
  //bar's `update` method each frame. After all the assets have been
  //loaded, Hexi's `validateAssets` method removes the loading bar.
  loadingBar() {

    if (!this._progressBarAdded) {

      //Run the method that creates the progress bar object
      this.progressBar = this.makeProgressBar();

      //Create the loading bar
      this.progressBar.create();

      //Tell Hexi that a progress bar has been added
      this._progressBarAdded = true;

    } else {

      //Update the progress bar each frame
      this.progressBar.update();
    }
  }

  //Hexi's root `stage` object will have a width and height equal to
  //its contents, not the size of the canvas. So, let's use the more
  //useful canvas width and height for relative positioning instead
  compensateForStageSize(o) {
    if (o._stage === true) {
      let a = {};
      a.x = 0;
      a.y = 0;
      a.width = this.canvas.width;
      a.height = this.canvas.height;
      a.halfWidth = this.canvas.width / 2;
      a.halfHeight = this.canvas.height / 2;
      a.xAnchorOffset = 0;
      a.yAnchorOffset = 0;
      return a;
    }
  }

  //High level functions for accessing the loaded resources and custom parsed
  //objects, like sounds.
  image(imageFileName) {
    if (this.TextureCache[imageFileName]) {
      return this.TextureCache[imageFileName];
    } else {
      throw new Error(`${imageFileName} does not appear to be an image`);
    }
  }
  id(textureAtlasFrameId) {
    if (this.TextureCache[textureAtlasFrameId]) {
      return this.TextureCache[textureAtlasFrameId];
    } else {
      throw new Error(`${textureAtlasFrameId} does not appear to be a texture atlas frame id`);
    }
  }
  json(jsonFileName) {
    if (this.loader.resources[jsonFileName].data) {
      return this.resources[jsonFileName].data;
    } else {
      throw new Error(`${jsonFileName} does not appear to be a JSON data file`);
    }
  }
  xml(xmlFileName) {
    if (this.loader.resources[xmlFileName].data) {
      return this.resources[xmlFileName].data;
    } else {
      throw new Error(`${xmlFileName} does not appear to be a XML data file`);
    }
  }
  sound(soundFileName) {
    if (this.soundObjects[soundFileName]) {
      return this.soundObjects[soundFileName];
    } else {
      throw new Error(`${soundFileName} does not appear to be a sound object`);
    }
  }

  responseIframe() {
    //Keyboard focus in an iframe
    window.addEventListener('load', function () {
      window.focus();
      document.body.addEventListener('click', function (e) {
        window.focus();
      }, false);
    });
  }
}