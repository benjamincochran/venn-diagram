function $(id) {
    return document.getElementById(id)
}
 
/*
if (console && !console.time) {
    function getMS() {
        return (new Date()).getTime();
    }
    
    window.timers = {};
    console.time = function(timeName) {
        window.timers[timeName] = getMS();
    }
    console.timeEnd = function(timeName) {
        console.log(timeName + ": " + (getMS() - window.timers[timeName]) + "ms")
    }
}*/
 
/**
 * DataTest functions
 * @constructor
 */
(function() {
    
    var applicants = [];
    
    /**
     * Fill the venn buckets!
     * 
     * @private
     */
    function fillBuckets() {
        //console.time('bucket');
        //console.time('clear');
        //clear all ids
        for (var set in vennSets) {
            vennSets[set].ids = [];
            vennSets[set].size = 0;
        }
        for (var i = 0; i < vennIntersections.length; i++) {
            vennIntersections[i].ids = [];
            vennIntersections[i].size = 0;
        }
        //console.timeEnd('clear');
        //console.time('applicant');
        
        //for each applicant, add (or not) to appropriate sets & intersections
        var filterValues = {
            A: $('A').value,
            B: $('B').value,
            C: $('C').value
        };
        
        for (var i = 0, ii = applicants.length; i < ii; i++) {
            var applicant = applicants[i];
            var setFlags = {
                A: false,
                B: false,
                C: false
            };
            //call specialized filters here
            if (applicant.specialty > filterValues.A) {
                setFlags.A = true;
            }
            if (applicant.yearsExp > filterValues.B) {
                setFlags.B = true;
            }
            if (applicant.distance > filterValues.C) {
                setFlags.C = true;
            }
            
            //add applicants to appropriate sets
            for (var flag in setFlags) {
                if (setFlags[flag]) {
                    vennSets[flag].ids.push(applicant.id);
                }
            }
            
            //add applicants to the appropriate 2-set intersections
            for (var j = 0; j < vennIntersections.length; j++) {
                var vennIntersection = vennIntersections[j];
                if (setFlags[vennIntersection.sets[0]] && setFlags[vennIntersection.sets[1]]) {
                    vennIntersection.ids.push(applicant.id);
                }
            }
            
            //add applicants to the 3-set intersection if all 3 tests have passed, and the "none" bucket if none have
            var setCount = 0;
            for (var flag in setFlags) {
                if (setFlags[flag]) {
                    setCount++;
                }
            }
            if (setCount === 0) {
                vennNone.ids.push(applicant.id);
            }
            else if (setCount === 3) {
                vennAll.ids.push(applicant.id);
            }
                
        }
        //console.timeEnd('applicant');
        
        //generate relative size per set
        for (var set in vennSets) {
            setVennSize(vennSets[set], 1, 8);
        }
        
        //and per interaction
        for (var i = 0; i < vennIntersections.length; i++) {
            setVennSize(vennIntersections[i], null, 10);
        }
        
        setVennSize(vennNone, .125, 8);
        
        //console.timeEnd('bucket');
        vennDraw();
    };
    
    /**
     * Based derive the relative size of the venn object (set, intersection) based on the total
     * number of returned applicants, optionally capping that size with a min and/or a max.
     * 
     * @param venn
     * @param maxSize
     * @param minSize
     * @private
     */
    function setVennSize(venn, minSize, maxSize) {
        venn.size = venn.ids.length / applicants.length * 10;
        //console.log(venn.size + " size:", venn.size);
        if (minSize && venn.size < minSize) {
            venn.size = minSize;
        }
        if (maxSize && venn.ids.size > maxSize) {
            venn.size = maxSize;
        }
    }
    
    /**
     * @constructor
     * @class DataRequestType
     * @param name
     * @param getData
     * @param populateApplicants
     * @private
     */
    function DataRequestType(name, getData) {
        this.name = name;
        this.getData = getData;
    }
    DataRequestType.prototype.name = null;
    DataRequestType.prototype.getData = function() {
        alert('override me!');
    };
    DataRequestType.prototype.run = function(dataSetSize) {
        applicants = [];
        if (!dataSetSize) {
            dataSetSize = prompt('Data set size');
        }
        if (!dataSetSize) {
            return false;
        }
        //console.time('TOTAL FOR ' + this.name);
        this.getData(dataSetSize);
    };
    
    var fullDataRequest = new DataRequestType(
        'Full',
        function(dataSetSize) {
            YAHOO.util.Connect.asyncRequest('GET', '/visualizationTestData?dataSetSize=' + dataSetSize, {
                success: function(response) {
                    //console.time('parse');
                    applicants = YAHOO.lang.JSON.parse(response.responseText).applicants;
                    //console.timeEnd('parse');
                    fillBuckets();
                    //console.timeEnd('TOTAL FOR ' + 'Full');
                },
                cache: false
            });
        }
    );
    
    var multipartDataRequest = new DataRequestType(
        'Multipart',
        function(dataSetSize) {
            
            var populateApplicants = function(jsonString) {
                //console.time('parse');
                applicants = applicants.concat(YAHOO.lang.JSON.parse(jsonString).applicants);
                //console.timeEnd('parse');
            };
            
            var recursiveRequest = function() {
                YAHOO.util.Connect.asyncRequest('GET', '/visualizationTestData?index=' + applicants.length + '&dataSetSize=' + (dataSetSize > 1000 ? 1000 : dataSetSize), {
                    success: function(response) {
                        populateApplicants(response.responseText);
                        //console.log(applicants.length);
                        if (applicants.length < dataSetSize) {
                            recursiveRequest();
                        }
                        else {
                            fillBuckets();
                            //console.timeEnd('TOTAL FOR ' + 'Multipart');
                        }
                    }
                });
            };
            
            recursiveRequest();
        }
    );
    
    var chunkDataRequest = new DataRequestType(
        'Chunk', 
        function(dataSetSize) {
            YAHOO.util.Connect.asyncRequest('GET', '/visualizationTestData?dataSetSize=' + dataSetSize, {
                success: function(response) {
                    var applicantChunks = [];
                    var applicantString = response.responseText.substring(response.responseText.indexOf('[') + 1, response.responseText.indexOf(']'));
                    while (applicantString != '') {
                        applicantChunks[applicantChunks.length] = applicantString.slice(0, 10000);
                        applicantString = applicantString.substring(10000);
                    }
                    //console.time('parse');
                    for (var i = 0, ii = applicantChunks.length; i < ii; i++) {
                        var applicantChunk = applicantChunks[i];
                        if (applicantChunk.charAt(applicantChunk.length - 1) != '}' && i + 1 < ii) {
                            var nextApplicantChunk = applicantChunks[i + 1];
                            var nextChunkFirstDelimIndex = nextApplicantChunk.indexOf('},') + 1;
                            applicantChunk += nextApplicantChunk.substring(0, nextChunkFirstDelimIndex);
                            applicantChunks[i + 1] = nextApplicantChunk.substring(nextChunkFirstDelimIndex);
                        }
                        if (applicantChunk.charAt(0) == ',') {
                            applicantChunk = applicantChunk.substring(1);
                        }
                        applicantChunk = '[' + applicantChunk + ']';
                        applicants = applicants.concat(YAHOO.lang.JSON.parse(applicantChunk));
                    }
                    //console.timeEnd('parse');
                    fillBuckets(applicants);
                    //console.timeEnd('TOTAL FOR ' + 'Chunk');
                }
            });
        }
    );
    
    var biteDataRequest = new DataRequestType(
        'Bite',
        function(dataSetSize)  {
            YAHOO.util.Connect.asyncRequest('GET', '/visualizationTestData?dataSetSize=' + dataSetSize, {
                success: function(response) {
                    var splitApplicants = response.responseText.substring(response.responseText.indexOf('[') + 1, response.responseText.indexOf(']')).split('},{');
                    //console.time('parse');
                    for (var i = 0, ii = splitApplicants.length; i < ii; i++) {
                        var applicant = splitApplicants[i];
                        if (applicant.charAt(0) != '{') {
                            applicant = '{' + applicant;
                        }
                        if (applicant.charAt(applicant.length - 1) != '}') {
                            applicant += '}';
                        }
                        applicants.push(YAHOO.lang.JSON.parse(applicant));
                    }
                    //console.timeEnd('parse');
                    fillBuckets(applicants);
                    //console.timeEnd('TOTAL FOR ' + 'Bite');
                }
            });
        }
    );
    
    /**
     * @namespace DataTest
     */
    DataTest = {
        /**
         * @member DataTest
         */
        getApplicants: function() {
            return applicants;
        },
        DataRequests : {
            full: function(args) {
                fullDataRequest.run.call(fullDataRequest, args);
            },
            chunk: function(args) {
                chunkDataRequest.run.call(chunkDataRequest, args);
            },
            bite: function(args) {
                biteDataRequest.run.call(biteDataRequest, args);
            },
            multipart: function(args) {
                multipartDataRequest.run.call(multipartDataRequest, args);
            }
        }
    };
    
    YAHOO.util.Event.onDOMReady(function() {
        YAHOO.util.Event.on(document.forms[0].getElementsByTagName('BUTTON'), 'click', function(event) {
            YAHOO.util.Event.stopEvent(event);
            fillBuckets();
        });
    });
    
}());
 
var zoomRatio = 1;
function zoom(zoomMod) {
    zoomRatio = zoomRatio + zoomMod;
    if (zoomRatio <= 0) {
        zoomRatio = 0.25;
    }
    $('zoomRatio').innerHTML = zoomRatio;
    zoomSet.animate({scale: zoomRatio + ", " + zoomRatio + ", " + vennPaper.center.x + ", " + vennPaper.center.y}, 333);
}
 
var sizeRadiusMultiplier = 20;
var vennSets = {
    A: {
        edgePoints: [],
        ids: [],
        size: 0,
        color: 'red'
    },
    B: {
        edgePoints: [],
        ids: [],
        size: 0,
        color: 'green'
    },
    C: {
        edgePoints: [],
        ids: [],
        size: 0,
        color: 'blue'
    }
};
var vennNone = {
    ids: [],
    size: 0,
    color: 'silver'
};
 
var intersectionSizeMultiplier = 30;
var vennIntersections = [
    {
        sets: ['A', 'B'],
        ids: [],
        size: 0
    },
    {
        sets: ['B', 'C'],
        ids: [],
        size: 0
    },
    {
        sets: ['C', 'A'],
        ids: [],
        size: 0
    }
];
var vennAll = {
    ids: []
};
 
var vennPaper
var zoomSet;
 
function vennDraw() {
    //vennPaper.clear();
    //zoomSet.items = [];
    
    //find basic centers for the venn sets
    var vennSetIndex = 0;
    for (var vennSetName in vennSets) {
        var vennSet = vennSets[vennSetName];
        var angle = 120 * vennSetIndex;
        vennSet.edgePoints = [];
        vennSet.center = {
            x: vennPaper.center.x + Math.cos((angle * Math.PI) / 180) * vennSet.size * sizeRadiusMultiplier, 
            y: vennPaper.center.y - Math.sin((angle * Math.PI) / 180) * vennSet.size * sizeRadiusMultiplier
        };
        //vennPaper.circle(vennSet.center.x, vennSet.center.y, 3).attr({fill: vennSet.color});
        vennSet.r = vennSet.size * (sizeRadiusMultiplier);
        vennSetIndex++;
    }
 
    //draw imaginary lines between center points to find areas that must be encompassed by intersections
    for (var i = 0; i < vennIntersections.length; i++) {
        var vennIntersection = vennIntersections[i];
        var v0;
        var v1;
        if (vennSets[vennIntersection.sets[0]].size > vennSets[vennIntersection.sets[1]].size) {
            v0 = vennSets[vennIntersection.sets[0]];
            v1 = vennSets[vennIntersection.sets[1]];
        }
        else {
            v0 = vennSets[vennIntersection.sets[1]];
            v1 = vennSets[vennIntersection.sets[0]];
        }
        
        //imaginary line connecting the two vennset centers
        //vennIntersection.path = vennPaper.path('M' + v0.center.x + ',' + v0.center.y + 'L' + v1.center.x + ',' + v1.center.y).attr({stroke: 'silver'});
        var d = Math.sqrt( Math.pow(v0.center.x - v1.center.x, 2) + Math.pow(v0.center.y - v1.center.y, 2));
        var a = (Math.pow(v0.r, 2) - Math.pow(v1.r, 2) + Math.pow(d, 2))/(2 * d);
        vennIntersection.center = {
            x: v0.center.x + a * (v1.center.x - v0.center.x)/d,
            y: v0.center.y + a * (v1.center.y - v0.center.y)/d
        };
        
        //imaginary squared circle based on overlap size
        //vennPaper.circle(vennIntersection.center.x, vennIntersection.center.y, 1.5).attr({fill: 'silver', stroke: 'silver'});
        var sqSize = Math.sqrt(vennIntersection.size) * intersectionSizeMultiplier;
        /*vennPaper.rect(
            vennIntersection.center.x - sqSize/2,
            vennIntersection.center.y - sqSize/2,
            sqSize,
            sqSize
        ).attr({stroke: 'silver'});*/
        var r = Math.sqrt(Math.pow(sqSize/2, 2) * 2);
        //vennPaper.circle(vennIntersection.center.x, vennIntersection.center.y, r).attr({stroke: 'silver'});
        
        //set edge points
        vennSets[vennIntersection.sets[0]].edgePoints.push({
            x: vennIntersection.center.x + (Math.cos(Math.acos((vennSets[vennIntersection.sets[1]].center.x - vennSets[vennIntersection.sets[0]].center.x)/d)) * r),
            y: vennIntersection.center.y + (Math.sin(Math.asin((vennSets[vennIntersection.sets[1]].center.y - vennSets[vennIntersection.sets[0]].center.y)/d)) * r)
        });
        vennSets[vennIntersection.sets[1]].edgePoints.push({
            x: vennIntersection.center.x + (Math.cos(Math.acos((vennSets[vennIntersection.sets[0]].center.x - vennSets[vennIntersection.sets[1]].center.x)/d)) * r),
            y: vennIntersection.center.y + (Math.sin(Math.asin((vennSets[vennIntersection.sets[0]].center.y - vennSets[vennIntersection.sets[1]].center.y)/d)) * r)
        });
    }
    
    //set true center points for venn sets based on edge points and radius; draw circle
    for (var vennSetName in vennSets) {
        //console.group(vennSetName);
        var vennSet = vennSets[vennSetName];
        /*for (var i = 0; i < vennSet.edgePoints.length; i++) {
            vennPaper.circle(vennSet.edgePoints[i].x, vennSet.edgePoints[i].y, 1.5).attr({fill: vennSet.color, stroke: vennSet.color});
        }*/
        var edgeYDelta = vennSet.edgePoints[0].y - vennSet.edgePoints[1].y;
        var edgeXDelta = vennSet.edgePoints[0].x - vennSet.edgePoints[1].x;
        var base = Math.sqrt(Math.pow(edgeYDelta, 2) + Math.pow(edgeXDelta, 2));
        var baseCenter = {
            x: vennSet.edgePoints[0].x - ((vennSet.edgePoints[0].x - vennSet.edgePoints[1].x)/2),
            y: vennSet.edgePoints[0].y - ((vennSet.edgePoints[0].y - vennSet.edgePoints[1].y)/2)
        };
        //console.dir(baseCenter);
        //vennPaper.circle(baseCenter.x, baseCenter.y, 1.5).attr({fill: vennSet.color, stroke: vennSet.color});
        var height = Math.sqrt(Math.abs(Math.pow(vennSet.r, 2) - Math.pow(base, 2)/4));
        var similarAngle = Math.atan(edgeXDelta / edgeYDelta);
        /*console.log("similarAngle", similarAngle);
        console.log("height", height);
        console.log("edgeYDelta", edgeYDelta);
        console.log("edgeXDelta", edgeXDelta);
        console.log("Math.cos(similarAngle)", Math.cos(similarAngle));
        console.log("Math.sin(similarAngle)", Math.sin(similarAngle));*/
        
        vennSet.center = {
            x: baseCenter.x + Math.cos(similarAngle) * height * (Math.abs(edgeYDelta) > Math.abs(edgeXDelta) ? 1 : -1),
            y: baseCenter.y + Math.sin(similarAngle) * height * (Math.abs(edgeYDelta) > Math.abs(edgeXDelta) ? -1 : 1)
        };
        //console.dir(vennSet.center);
        //zoomSet.push(vennPaper.circle(vennSet.center.x, vennSet.center.y, 2).attr({fill: 'white', stroke: vennSet.color}));
        if (!vennSet.circle) {
            zoomSet.push(vennSet.circle = vennPaper.circle(vennSet.center.x, vennSet.center.y, vennSet.r).attr({fill: vennSet.color, opacity: .15}));
            YAHOO.util.Dom.addClass(vennSet.circle.node, 'interactable');
            YAHOO.util.Event.on(vennSet.circle.node, 'mouseover', function(event, circle) {
                circle.attr({opacity: .25});
            }, vennSet.circle);
            YAHOO.util.Event.on(vennSet.circle.node, 'mouseout', function(event, circle) {
                circle.attr({opacity: .15});
            }, vennSet.circle);
            YAHOO.util.Event.on(vennSet.circle.node, 'click', function(event, vennSet) {
                alert(vennSet.ids.length);
            }, vennSet);
        }
        else {
            vennSet.circle.animate({cx: vennSet.center.x, cy: vennSet.center.y, r: vennSet.r}, 350, '>');
        }
        //console.groupEnd();
    }
 
    //draw shapes over the 2-set intersections
    for (var i = 0; i < vennIntersections.length; i++) {
        var vennIntersection = vennIntersections[i];
        var v0;
        var v1;
        if (vennSets[vennIntersection.sets[0]].size > vennSets[vennIntersection.sets[1]].size) {
            v0 = vennSets[vennIntersection.sets[0]];
            v1 = vennSets[vennIntersection.sets[1]];
        }
        else {
            v0 = vennSets[vennIntersection.sets[1]];
            v1 = vennSets[vennIntersection.sets[0]];
        }
        
        //imaginary line connecting the two vennset centers
        var d = Math.sqrt( Math.pow(v0.center.x - v1.center.x, 2) + Math.pow(v0.center.y - v1.center.y, 2));
        //vennIntersection.path = vennPaper.path('M' + v0.center.x + ',' + v0.center.y + 'L' + v1.center.x + ',' + v1.center.y).attr({stroke: 'black'});
        var a = (Math.pow(v0.r, 2) - Math.pow(v1.r, 2) + Math.pow(d, 2))/(2 * d);
        vennIntersection.center = {
            x: v0.center.x + a * (v1.center.x - v0.center.x)/d,
            y: v0.center.y + a * (v1.center.y - v0.center.y)/d
        };
        //vennPaper.circle(vennIntersection.center.x, vennIntersection.center.y, 1.5).attr({fill: 'yellow'});
        
        var h = Math.sqrt( Math.pow(v0.r, 2) - Math.pow(a, 2) );
        
        vennIntersection.intersectPoints = [];
        vennIntersection.intersectPoints[0] = {
            x: vennIntersection.center.x + h * (v1.center.y - v0.center.y)/d,
            y: vennIntersection.center.y - h * (v1.center.x - v0.center.x)/d
        };
        //vennPaper.circle(vennIntersection.intersectPoints[0].x, vennIntersection.intersectPoints[0].y, 1.5).attr({fill: 'purple'});
        vennIntersection.intersectPoints[1] = {
            x: vennIntersection.center.x - h * (v1.center.y - v0.center.y)/d,
            y: vennIntersection.center.y + h * (v1.center.x - v0.center.x)/d
        };
        //vennPaper.circle(vennIntersection.intersectPoints[1].x, vennIntersection.intersectPoints[1].y, 1.5).attr({fill: 'purple'});
        
        intersectionPath = "M";
        intersectionPath += (" " + vennIntersection.intersectPoints[0].x + " " + vennIntersection.intersectPoints[0].y);
        intersectionPath += (" A " + v0.r + " " + v0.r + " 0 0 1 " + vennIntersection.intersectPoints[1].x + " " + vennIntersection.intersectPoints[1].y);
        intersectionPath += (" A " + v1.r + " " + v1.r + " 0 0 1 " + vennIntersection.intersectPoints[0].x + " " + vennIntersection.intersectPoints[0].y);
        intersectionPath += " Z";
        if (vennIntersection.area) {
            vennIntersection.area.remove();
        }
        vennIntersection.area = vennPaper.path(intersectionPath).attr({fill: 'black', stroke: 'black', opacity: 0}); 
        zoomSet.push(vennIntersection.area);
        YAHOO.util.Dom.addClass(vennIntersection.area.node, 'interactable');
        YAHOO.util.Event.on(vennIntersection.area.node, 'mouseover', function(event, area) {
            YAHOO.util.Event.stopEvent(event);
            area.attr({opacity: .25});
        }, vennIntersection.area);
        YAHOO.util.Event.on(vennIntersection.area.node, 'mouseout', function(event, area) {
            YAHOO.util.Event.stopEvent(event);
            area.attr({opacity: 0});
        }, vennIntersection.area);
        YAHOO.util.Event.on(vennIntersection.area.node, 'click', function(event, vennIntersection) {
            alert(vennIntersection.sets + ": " + vennIntersection.ids.length);
        }, vennIntersection);
        
    }
    
    //draw shape overlapping the 3-set intersection
}
 
YAHOO.util.Event.onDOMReady(function() {
    vennPaper = Raphael($('paper'), 800, 600);
    zoomSet = vennPaper.set();
    vennPaper.center = {x: 400, y: 300};
});