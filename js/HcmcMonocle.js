
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

        //Property to keep track of the current page that's showing.
        this.currSurface = -1;

        //These are the ids of elements on the page we need to connect to.
        this.requiredIds = new Array('facsTitle', 'facsMetadata', 'collection', 'thumbnails',
                                     'oneSurface', 'oneSurfaceImage', 'btnPanUp', 'btnPanRight', 
                                     'btnPanDown', 'btnPanLeft', 'btnPanPlus', 'btnPanMinus', 
                                     'btnRotate', 'btnDarkLight', 'btnReset', 'btnLeft', 'btnRight');
                                    
        //Find each of thest things and connect it to a property.                             
        for (let id of this.requiredIds){
            this[id] = document.getElementById(id);
            if (!this[id]){console.error(`ERROR: Item with id ${id} not found.`);}
        }
        
        //Add handlers to various buttons.
        this.btnLeft.addEventListener('click', function(){this.switchSurface(-1)}.bind(this));
        this.btnRight.addEventListener('click', function(){this.switchSurface(1)}.bind(this));
        this.btnRotate.addEventListener('click', function(){this.rotateImage()}.bind(this));
        this.btnReset.addEventListener('click', function(){this.resetImage()}.bind(this));

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
    }

    /** 
     *  @function HcmcMonocle~showMetadata 
     *  @description This displays the facsimile-level metadata
    */
    showMetadata(l){
        //TODO: Logic for displaying metadata.
        console.log('Showing project metadata...');
        this.facsTitle.innerHTML = this.data.facsTitleMain;
    }

    /**
    * @function HcmcMonocle~adjustImage
    * @description Function to move an image container so that its top
    *              and left are onscreen, making the whole image available 
    *              for scrolling.
    */
    adjustImage(){
        if ((this.oneSurface !== null)&&(this.oneSurfaceImage !== null)){
            let leftOrigin = 50;
            while (this.oneSurfaceImage.getBoundingClientRect().x < 20){
                leftOrigin--;
                this.oneSurface.style.transformOrigin = leftOrigin + '% 0%';
            }
        }
    }

    /**
    * @function HcmcMonocle~rotateImage
    * @description Function to rotate the image by 90 degrees. This reads the
    *              current value of the transform property, parses out the 
    *              rotation bit (if it's there), increments it and puts it back.
    */
    rotateImage(){
        let img = this.oneSurfaceImage;
        if (img !== null){
            let tf = img.style.transform;
            let strCurrRot = tf.replace(/^(.*)rotate\((\d+)deg\)(.*)$/, '$2');
            let currRot = (strCurrRot.match(/^\d+$/))? parseInt(strCurrRot): 0;
            let newRot = ((currRot + 90) % 360);
            if (tf.indexOf('rotate') > -1){
                img.style.transform = tf.replace(/^(.*)rotate\((\d+)deg\)(.*)$/, '$1rotate(' + newRot + 'deg)$3');
            }
            else{
                img.style.transform = tf.replace('none', '') + ' rotate(' + newRot + 'deg)';
            }
            setTimeout(function(){this.adjustImage();}.bind(this), 1);
        }
    }
    /**
    * @function HcmcMonocle~resetImage
    * @description Function to move an image container so that its top
    *              and left are onscreen, making the whole image available 
    * for scrolling.
    */
    resetImage(){
        if ((this.oneSurface !== null)&&(this.oneSurfaceImage !== null)){
            let img = this.oneSurfaceImage;
            //Fix the left origin.
            this.oneSurface.style.transformOrigin = '0% 0%';
            //Fix the rotation.
            let tf = img.style.transform;
            img.style.transform = tf.replace(/^(.*)rotate\((\d+)deg\)(.*)$/, '$1rotate(0deg)$3');

        }
    }
}
    