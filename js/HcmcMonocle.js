
/*                 XSet.js                 */
/*         Author: Martin Holmes           */
/*        University of Victoria.          */

/** This file is part of the hcmcMonocle
  * project.
  *
  * Free to anyone for any purpose, but
  * acknowledgement would be appreciated.
  * The code is licensed under both MPL and BSD.
  */
  

"use strict";

var hcmcMonocle;
window.addEventListener('load', function(){hcmcMonocle = new HcmcMonocle();});

/** 
 *  @class HcmcMonocle
  * @description This class loads its properties from a JSON 
  *              file describing a collection of facsimile 
  *              images and metadata, and displays the appropriate
  *              content in the host web page.
  */
class HcmcMonocle{
    /**
     * Enum for panels, used to track which are showing.
     * @readonly
     * @enum {integer}
     */
    static PANELS = {
        NONE:      -1,
        COLLECTION: 0,
        ONESURFACE: 1,
        METADATA:   2
    };

    /** 
      * @constructor
      * @description The constructor analyzes the URL search params
      *              to find any information it needs, including 
      *              a JSON facsimile file. It loads the 
      *              file and populates its data object from it.
      */
      constructor(){

        //Headers used for all AJAX fetch requests.
        this.fetchHeaders = {
            credentials: 'same-origin',
            cache: 'default',
            headers: {'Accept': 'application/json'},
            method: 'GET',
            redirect: 'follow',
            referrer: 'no-referrer'
        };

        //Property to keep track of the current image that's showing.
        this.currSurface = -1;

        //Property to track whether the collection of thumbnails or the 
        //oneSurface view is showing.
        this.panelShowing = HcmcMonocle.PANELS.NONE;

        //Properties to control granularity of image scaling, rotating, and panning.
        this.scaleFactor = 0.2;
        this.panFactor = 5; //This is a percentage.
        this.rotateFactor = 45; //degrees
        this.panStart = [0, 0]; //A default translate starting point.

        //These are the ids of elements on the page we need to connect to.
        this.requiredIds = new Array('facsTitle', 'facsMetadata', 'collection', 'thumbnails',
                                     'oneSurface', 'oneSurfaceFigure', 'oneSurfaceImage', 'btnPanUp', 'btnPanRight', 
                                     'btnPanDown', 'btnPanLeft', 'btnPlus', 'btnMinus', 
                                     'btnRotate', 'btnDarkLight', 'btnReset', 'btnLeft', 
                                     'btnRight');
                                    
        //Find each of thest things and connect it to a property.                             
        for (let id of this.requiredIds){
            this[id] = document.getElementById(id);
            if (!this[id]){console.error(`ERROR: Item with id ${id} not found.`);}
        }
        
        //Add handlers to various buttons.
        this.btnLeft.addEventListener('click', function(){this.switchSurface(-1);}.bind(this));
        this.btnRight.addEventListener('click', function(){this.switchSurface(1);}.bind(this));
        this.btnRotate.addEventListener('click', function(){this.rotateImage();}.bind(this));
        this.btnReset.addEventListener('click', function(){this.resetImage();}.bind(this));
        this.btnPlus.addEventListener('click', function(){this.scaleImage(true);}.bind(this));
        this.btnMinus.addEventListener('click', function(){this.scaleImage(false);}.bind(this));
        this.btnPanUp.addEventListener('click', function(){this.panImage(0, -1)}.bind(this));
        this.btnPanRight.addEventListener('click', function(){this.panImage(1, 0)}.bind(this));
        this.btnPanDown.addEventListener('click', function(){this.panImage(0, 1)}.bind(this));
        this.btnPanLeft.addEventListener('click', function(){this.panImage(-1, 0)}.bind(this));

        //Keystroke shortcuts.
        window.addEventListener('keydown', function(e){ 
            if (e.altKey){
              if (e.key === '+'){
                this.scaleImage(true);
              }
              if (e.key === '-'){
                console.log('shrinking...');
                this.scaleImage(false);
              }
            }
        }.bind(this));

        //Add handlers for pointer events on the image.
        this.oneSurfaceImage.addEventListener('pointerdown', function(e){this.pointerDown(e);}.bind(this));
        this.oneSurfaceImage.addEventListener('pointermove', function(e){this.pointerMove(e);}.bind(this));
        this.oneSurfaceImage.addEventListener('pointerup', function(e){this.pointerUp(e);}.bind(this));

        //Figure out our config parameters based on the document URI.
        let searchParams = new URLSearchParams(decodeURI(document.location.search));

        //Create an object to hold the data.
        this.data = {};

        this.loaded = false;

        //Figure out the target image to show first, if there is one.
        this.targSurface = null;
        
        if (searchParams.has('targSurface')){
            this.targSurface = searchParams.get('targSurface').trim();
        }

        //Now look for a JSON file to get.
        this.jsonUri = null;

        if (searchParams.has('facs')){
            this.jsonUri = searchParams.get('facs').trim();
            //Retrieve the JSON to populate the object.
            this.populate();
        }
      }
    
    /** 
      * @function HcmcMonocle~populate
      * @description This attempts to retrieve the JSON facsimile
      *              file and populate the internal object. It is
      *              async.
      */
    async populate(){
        const request = new Request(this.jsonUri);
        const response = await fetch(request, this.fetchHeaders);
        const json = await response.json();
        this.data = json;
        this.loaded = true;
        this.display();
    }

    /** 
     * @function HcmcMonocle~display 
     * @description This generates the content required to display
     *              either the collection page, or the target starting
     *              page if there is one. Then it starts preloading
     *              images in the background.
    */
    display(){
        this.showMetadata();
        if (this.targSurface != null){
            this.showSurfaceByUrl(this.targSurface);
        }
        else{
            this.showCollection();
        }
        //Now we can start preloading images.
        let arrImages = new Array();
        for (let s of this.data.surfaces){
            let img = new Image();
            img.src =  this.data.textMetadata.imageBaseUrl + s.imageUrl;
            arrImages.push(img);
        }
    }

    /** 
     *  @function HcmcMonocle~showSurfaceByUrl 
     *  @description This displays a specific surface image in 
     *               the viewer, based on its URL.
     *  @param {string} targImageUrl The image URL to display.
    */
    showSurfaceByUrl(targImageUrl){
        console.log('Showing surface ' + targImageUrl);
        let idx = this.getSurfaceIndex(targImageUrl);
        if (idx > -1){
            this.showSurfaceByIndex(idx);
        }
        else{
            console.log('This surface image was not found: ' + targImageUrl);
        }
    }

    /** 
     *  @function HcmcMonocle~showSurfaceByIndex 
     *  @description This displays a specific surface image in 
     *               the viewer, based on its index in the surfaces array.
     *  @param {string} idx The index of the image.
    */
    showSurfaceByIndex(idx){
        if (idx > -1){
            //Logic for displaying a surface.
            this.currSurface = idx;
            this.oneSurfaceImage.setAttribute('src', this.data.textMetadata.imageBaseUrl + this.data.surfaces[idx].imageUrl);
            this.collection.style.display = 'none';
            this.oneSurface.style.display = 'block';
            this.panelShowing = HcmcMonocle.PANELS.ONESURFACE;
        }
        else{
            console.log('The surface image with this index was not found: ' + idx);
        }
    }

    /** 
     *  @function HcmcMonocle~switchSurface 
     *  @description This moves up or down the surface array by one position
     *               and displays the next surface.
     *  @param {integer} changeBy An integer expected to be 1 or -1.
    */
    switchSurface(changeBy){
        let newIdx = this.currSurface + changeBy;
        //We may have to wrap around.
        if (newIdx >= this.data.surfaces.length){
            newIdx = 0;
        }
        if (newIdx < 0){
            newIdx = this.data.surfaces.length - 1;
        }
        this.showSurfaceByIndex(newIdx);
    }

    /** 
     *  @function HcmcMonocle~getSurfaceIndex 
     *  @description This retrieves the index of a surface in the 
     *               array of surfaces (this.data.surfaces), based 
     *               on its imageUrl.
     *  @param {string} targImageUrl The image URL to search for.
     *  @return {integer} The index if found, or -1 if not. 
    */
    getSurfaceIndex(targImageUrl){
        //Nested callback function.
        function isMatch(surface){
            return surface.imageUrl === targImageUrl;
        }
        let idx = this.data.surfaces.findIndex(isMatch);
        if (idx > -1){
            return idx;
        }
        else{
            return -1;
        }
    }

    /** 
     *  @function HcmcMonocle~showCollection 
     *  @description This displays the entire collection of thumbnails
     *               as links to specific surfaces.
    */
    showCollection(l){
        //TODO: Logic for displaying all the thumbnails.
        console.log('Showing thumbnail page...');
        //Check whether it's already been constructed. If not, construct it 
        // first. Then hide the single-surface page and show the collection. 
        if (this.thumbnails.getElementsByTagName('figure').length < 1){
            console.log('Creating thumbnail display...');
            for (let s of this.data.surfaces){
                let f = document.createElement('figure');
                let i = document.createElement('img');
                i.setAttribute('src', this.data.textMetadata.thumbnailBaseUrl + s.thumbnailUrl);
                i.addEventListener('click', function(){this.showSurfaceByUrl(s.imageUrl)}.bind(this));
                f.appendChild(i);
                this.thumbnails.appendChild(f);
            }
        }
        this.oneSurface.style.display = 'none';
        this.collection.style.display = 'block';
        this.panelShowing = HcmcMonocle.PANELS.COLLECTION;
    }

    /** 
     *  @function HcmcMonocle~showMetadata 
     *  @description This displays the facsimile-level metadata
    */
    showMetadata(l){
        //TODO: Logic for displaying metadata.
        console.log('Showing project metadata...');
        this.facsTitle.innerHTML = this.data.facsTitleMain;
        let rows = new Array();
        for (let md of ['authority', 'availability', 'source']){
            let caption = this.propNameToCaption(md);
            let tr = document.createElement('tr');
            let td1 = document.createElement('td');
            td1.appendChild(document.createTextNode(caption));
            let td2 = document.createElement('td');
            td2.appendChild(document.createTextNode(this.data.textMetadata[md]));
            tr.appendChild(td1);
            tr.appendChild(td2);
            rows.push(tr);
        }
        let t = document.createElement('table');
        let tb = document.createElement('tbody');
        t.appendChild(tb);
        for (let tr of rows){
            tb.appendChild(tr);
        }
        this.facsMetadata.appendChild(t);
    }

    /** 
     *  @function HcmcMonocle~proNameToCaption 
     *  @description This converts a camel-case property name
     *               into a title-case caption.
     *  @param {string} propName The name of the property, often
     *               derived from a TEI element name.
     *  @return {string} A title-case caption.
    */
    propNameToCaption(propName){
        let str = propName.replace(/([a-z])([A-Z])/, '$1 $2');
        return str.substring(0, 1).toUpperCase() + str.substring(1);
    }

    /**
    * @function HcmcMonocle~rotateImage
    * @description Function to rotate the image by 90 degrees. This reads the
    *              current value of the transform property, parses out the 
    *              rotation bit (if it's there), increments it and puts it back.
    */
    rotateImage(){
        if (this.panelShowing === HcmcMonocle.PANELS.ONESURFACE){
            let img = this.oneSurfaceImage;
            if (img !== null){
                let currRot = img.style.rotate;
                if (currRot.match(/\d+deg/)){
                    currRot = parseInt(currRot);
                }
                else{
                    currRot = 0;
                }
                currRot += this.rotateFactor;
                img.style.rotate = currRot + 'deg';
            }
        }
    }

/**
    * @function HcmcMonocle~scaleImage
    * @description Function to scale an image by a positive or negative .02.
    *              This parses out the current value of the scale factor from 
    *              the transform property, then changes it appropriately.
    * @param {boolean} enlarge Boolean value to specify whether to enlarge or shrink.
    */
    scaleImage(enlarge){
        if (this.panelShowing === HcmcMonocle.PANELS.ONESURFACE){
            let img = this.oneSurfaceImage;
            if (img !== null){
                let currScale = img.style.scale;
                if (currScale.match(/[\d\.]+/)){
                    currScale = parseFloat(currScale);
                }
                else{
                    currScale = 1.0;
                }
                let newScale = parseFloat(currScale + (enlarge? this.scaleFactor : this.scaleFactor * -1));
                img.style.scale = newScale;
            }
        }
    }

    /**
    * @function HcmcMonocle~panImage
    * @description Function to pan an image by the panFactor amount, 
    *              vertically and/or horizontally.
    * @param {integer} x A value of -1, 1, or 0 to control horizontal panning.
    * @param {integer} y A value of -1, 1, or 0 to control vertical panning.
    */
    panImage(x, y){
        if (this.panelShowing === HcmcMonocle.PANELS.ONESURFACE){
            let img = this.oneSurfaceImage;   
            let currX, currY, newX, newY;[0-9]
            if (img !== null){
                //Get the current values.
                let currTrans = this.oneSurfaceImage.style.translate; //A string.
                if (currTrans.match(/-?\d+%\s+-?\d+%/)){
                    let bits = currTrans.split(/\s+/);
                    currX = parseInt(bits[0]);
                    currY = parseInt(bits[1]);
                }
                else{
                    currX = 0;
                    currY = 0;
                }
                newX = (x * this.panFactor) + currX;
                newY = (y * this.panFactor) + currY;
                img.style.translate = newX + '% ' + newY + '%';
            }
        }
    }

    /**
    * @function HcmcMonocle~resetImage
    * @description Function to move an image container so that its top
    *              and left are onscreen, making the whole image available 
    * for scrolling.
    */
    resetImage(){
        if (this.panelShowing === HcmcMonocle.PANELS.ONESURFACE){
            if ((this.oneSurface !== null)&&(this.oneSurfaceImage !== null)){
                let img = this.oneSurfaceImage;
                //Fix the scale.
                img.style.scale = 1;
                //Fix the rotation.
                img.style.rotate = 'none';
                //Fix the pan.
                img.style.translate = '0% 0%';
            }
        }
    }

    /**
     * @function HcmcMonocle~pointerDown
     * @description Handler for the pointerDown event on the oneSurfaceImage.
     * @param {Event} e The event received.
     */
    pointerDown(e){
        console.log('pointerDown event.');
        this.panStart = [e.pageX, e.pageY];
    }

    /**
     * @function HcmcMonocle~pointerMove
     * @description Handler for the pointerMove event on the oneSurfaceImage.
     * @param {Event} e The event received.
     */
    pointerMove(e){
        console.log('pointerMove event.');
    }

    /**
     * @function HcmcMonocle~pointerUp
     * @description Handler for the pointerUp event on the oneSurfaceImage.
     * @param {Event} e The event received.
     */
    pointerUp(e){
        console.log('pointerUp event.');
    }

}
    