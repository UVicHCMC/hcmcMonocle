
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

        //Find things in the page that we need to manipulate.
        this.pageTitle       = document.getElementById('facsTitle');
        this.facsMetadata    = document.getElementById('facsMetadata');
        this.collection      = document.getElementById('collection');
        this.oneSurface      = document.getElementById('oneSurface');
        this.oneSurfaceImage = document.getElementById('oneSurfaceImage');

        //Figure out our config parameters based on the document URI.
        let searchParams = new URLSearchParams(decodeURI(document.location.search));

        //Create an object to hold the data.
        this.data = {};

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
        this.display();
    }

    /** 
     * @function HcmcMonocle~display 
     * @description This generates the content required to display
     *              either the collection page, or the target starting
     *              page if there is one.
    */
    display(){
        this.showMetadata();
        if (this.targSurface != null){
            this.showSurface(targSurface);
        }
        else{
            this.showCollection();
        }
    }

    /** 
     *  @function HcmcMonocle~showSurface 
     *  @description This displays a specific surface image in 
     *               the viewer.
     *  @param {string} targImageUrl The image URL to display.
    */
    showSurface(targImageUrl){
        let idx = this.getSurfaceIndex(targImageUrl);
        if (idx > -1){
            //TODO: Logic for displaying a surface.
            console.log('Showing surface with image' + targImageUrl + '...');
            this.currSurface = idx;
        }
        else{
            console.log('This surface image was not found: ' + targImageUrl);
        }
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
        if (idx){
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
    }

    /** 
     *  @function HcmcMonocle~showMetadata 
     *  @description This displays the facsimile-level metadata
    */
    showMetadata(l){
        //TODO: Logic for displaying metadata.
        console.log('Showing project metadata...');
        this.pageTitle.innerHTML = this.data.facsTitleMain;
    }
}
    