import {Particle} from "./Particle";
import {ParticleUtils} from "./ParticleUtils";
import {Emitter} from "./Emitter";
import {GetTextureFromString} from "./ParticleUtils";
import {Point, Texture} from "pixi.js";

import { AnimatedParticle, ParsedAnimatedParticleArt, AnimatedParticleArt } from './AnimatedParticle';

const MATH_FUNCS =
[
	"pow",
	"sqrt",
	"abs",
	"floor",
	"round",
	"ceil",
	"E",
	"PI",
	"sin",
	"cos",
	"tan",
	"asin",
	"acos",
	"atan",
	"atan2",
	"log"
];

const WHITELISTER = new RegExp(
	[
		//Allow the 4 basic operations, parentheses and all numbers/decimals, as well
		//as 'x', for the variable usage.
		"[01234567890\\.\\*\\-\\+\\/\\(\\)x ,]",
	].concat(MATH_FUNCS).join("|"),
	"g"
);

const parsePath = function(pathString: string)
{
	let matches = pathString.match(WHITELISTER);
	for(let i = matches.length - 1; i >= 0; --i)
	{
		if(MATH_FUNCS.indexOf(matches[i]) >= 0)
			matches[i] = "Math." + matches[i];
	}
	pathString = matches.join("");
	return new Function("x", "return "+ pathString + ";");
};

const helperPoint = new Point();

/**
 * An individual particle image with an animation. Art data passed to the emitter must be
 * formatted in a particular way for AnimatedParticle to be able to handle it:
 *
 * ```typescript
 * {
 *     //framerate is required. It is the animation speed of the particle in frames per
 *     //second.
 *     //A value of "matchLife" causes the animation to match the lifetime of an individual
 *     //particle, instead of at a constant framerate. This causes the animation to play
 *     //through one time, completing when the particle expires.
 *     framerate: 6,
 *     //loop is optional, and defaults to false.
 *     loop: true,
 *     //textures is required, and can be an array of any (non-zero) length.
 *     textures: [
 *         //each entry represents a single texture that should be used for one or more
 *         //frames. Any strings will be converted to Textures with Texture.from().
 *         //Instances of PIXI.Texture will be used directly.
 *         "animFrame1.png",
 *         //entries can be an object with a 'count' property, telling AnimatedParticle to
 *         //use that texture for 'count' frames sequentially.
 *         {
 *             texture: "animFrame2.png",
 *             count: 3
 *         },
 *         "animFrame3.png"
 *     ]
 * }
 * ```
 */
export class AnimatedPathParticle extends AnimatedParticle
{
	// /**
	//  * Texture array used as each frame of animation, similarly to how MovieClip works.
	//  */
	// private textures: Texture[];

	// /**
	//  * Duration of the animation, in seconds.
	//  */
	// private duration: number;

	// /**
	//  * Animation framerate, in frames per second.
	//  */
	// private framerate: number;

	// /**
	//  * Animation time elapsed, in seconds.
	//  */
	// private elapsed: number;

	// /**
	//  * If this particle animation should loop.
	//  */
	// private loop: boolean;

	// /////////////////////////////////////////////////////
		/**
	 * The function representing the path the particle should take.
	 */
	public path: Function;
	/**
	 * The initial rotation in degrees of the particle, because the direction of the path
	 * is based on that.
	 */
	public initialRotation: number;
	/**
	 * The initial position of the particle, as all path movement is added to that.
	 */
	public initialPosition: Point;
	/**
	 * Total single directional movement, due to speed.
	 */
	public movement: number;
	
	/**
	 * @param emitter The emitter that controls this AnimatedParticle.
	 */
	constructor(emitter: Emitter)
	{
		super(emitter);

		// this.textures = null;
		// this.duration = 0;
		// this.framerate = 0;
		// this.elapsed = 0;
		// this.loop = false;

		// ////////////////////////////////
		this.path = null;
		this.initialRotation = 0;
		this.initialPosition = new Point();
		this.movement = 0;
	}

	/**
	 * Initializes the particle for use, based on the properties that have to
	 * have been set already on the particle.
	 */
	public init()
	{
		// this.Particle_init();

		// this.elapsed = 0;

		// //if the animation needs to match the particle's life, then cacluate variables
		// if(this.framerate < 0)
		// {
		// 	this.duration = this.maxLife;
		// 	this.framerate = this.textures.length / this.duration;
		// }

		// /////////////////////////////////
		super.init()
		this.initialRotation = this.rotation;
		this.path = this.extraData.path;
		//cancel the normal movement behavior
		this._doNormalMovement = !this.path;
		//reset movement
		this.movement = 0;
		//grab position
		this.initialPosition.x = this.position.x;
		this.initialPosition.y = this.position.y;
	}

	// /**
	//  * Sets the textures for the particle.
	//  * @param art An array of PIXI.Texture objects for this animated particle.
	//  */
	// public applyArt(art: ParsedAnimatedParticleArt)
	// {
	// 	this.textures = art.textures;
	// 	this.framerate = art.framerate;
	// 	this.duration = art.duration;
	// 	this.loop = art.loop;
	// }

	/**
	 * Updates the particle.
	 * @param delta Time elapsed since the previous frame, in __seconds__.
	 */
	public update(delta: number): number
	{
		// const lerp = this.Particle_update(delta);
		// //only animate the particle if it is still alive
		// if(lerp >= 0)
		// {
		// 	this.elapsed += delta;
		// 	if(this.elapsed > this.duration)
		// 	{
		// 		//loop elapsed back around
		// 		if(this.loop)
		// 			this.elapsed = this.elapsed % this.duration;
		// 		//subtract a small amount to prevent attempting to go past the end of the animation
		// 		else
		// 			this.elapsed = this.duration - 0.000001;
		// 	}
		// 	// add a very small number to the frame and then floor it to avoid
		// 	// the frame being one short due to floating point errors.
		// 	let frame = (this.elapsed * this.framerate + 0.0000001) | 0;
		// 	console.log(frame)
		// 	this.texture = this.textures[frame] || Texture.EMPTY;
		// }
		const lerp = super.update(delta);

		if(lerp >= 0 && this.path)
		{
			//increase linear movement based on speed
			const speed = this.speedList.interpolate(lerp) * this.speedMultiplier;
			this.movement += speed * delta;
			//set up the helper point for rotation
			helperPoint.x = this.movement;
			helperPoint.y = this.path(this.movement);
			ParticleUtils.rotatePoint(this.initialRotation, helperPoint);
			this.position.x = this.initialPosition.x + helperPoint.x;
			this.position.y = this.initialPosition.y + helperPoint.y;
		}
		return lerp;
	}

	/**
	 * Destroys the particle, removing references and preventing future use.
	 */
	public destroy()
	{
		super.destroy();
		this.path = this.initialPosition = null;
	}

	/**
	 * Checks over the art that was passed to the Emitter's init() function, to do any special
	 * modifications to prepare it ahead of time.
	 * @param art The array of art data, properly formatted for AnimatedParticle.
	 * @return The art, after any needed modifications.
	 */
	public static parseArt(art: AnimatedParticleArt[])
	{
		let data, output: any, textures, tex, outTextures;
		let outArr:ParsedAnimatedParticleArt[] = [];
		for(let i = 0; i < art.length; ++i)
		{
			data = art[i];
			outArr[i] = output = {} as ParsedAnimatedParticleArt;
			output.textures = outTextures = [];
			textures = data.textures;
			for(let j = 0; j < textures.length; ++j)
			{
				tex = textures[j];
				if(typeof tex == "string")
					outTextures.push(GetTextureFromString(tex));
				else if(tex instanceof Texture)
					outTextures.push(tex);
				//assume an object with extra data determining duplicate frame data
				else
				{
					let dupe = tex.count || 1;
					if(typeof tex.texture == "string")
						tex = GetTextureFromString(tex.texture);
					else// if(tex.texture instanceof Texture)
						tex = tex.texture;
					for(; dupe > 0; --dupe)
					{
						outTextures.push(tex);
					}
				}
			}

			//use these values to signify that the animation should match the particle life time.
			if(data.framerate == "matchLife")
			{
				//-1 means that it should be calculated
				output.framerate = -1;
				output.duration = 0;
				output.loop = false;
			}
			else
			{
				//determine if the animation should loop
				output.loop = !!data.loop;
				//get the framerate, default to 60
				output.framerate = data.framerate > 0 ? data.framerate : 60;
				//determine the duration
				output.duration = outTextures.length / output.framerate;
			}
		}

		return outArr;
	}

	public static parseData(extraData: {path:string})
	{
		let output: any = {};
		if(extraData && extraData.path)
		{
			try
			{
				output.path = parsePath(extraData.path);
			}
			catch(e)
			{
				if(ParticleUtils.verbose)
					console.error("PathParticle: error in parsing path expression");
				output.path = null;
			}
		}
		else
		{
			if(ParticleUtils.verbose)
				console.error("PathParticle requires a path string in extraData!");
			output.path = null;
		}
		return output;
	}
}