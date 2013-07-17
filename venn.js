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
    
    var fakeDataRequest = new DataRequestType(
        'Fake',
        function() {
            applicants = hackData;
            fillBuckets();
        }
    );
    
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
            },
            fake: function() {
                fakeDataRequest.run.call(fakeDataRequest, 123);
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
    vennPaper.clear();
    zoomSet.items = [];
    
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
        vennPaper.circle(vennSet.center.x, vennSet.center.y, 3).attr({fill: vennSet.color});
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

//hack until I convert to using jsonp
var hackData = [
            {
                "distance": 570, 
                "guid": "72f15c29-2ab8-4de9-84bb-1d13304a3f79", 
                "id": 0, 
                "yearsExp": 20, 
                "specialty": 12
            }, 
            {
                "distance": 361, 
                "guid": "492ecdf6-e648-4735-9ac7-71642973bf2d", 
                "id": 1, 
                "yearsExp": 30, 
                "specialty": 10
            }, 
            {
                "distance": 616, 
                "guid": "2d5b484e-5aaa-4221-96d9-da85c86c1810", 
                "id": 2, 
                "yearsExp": 8, 
                "specialty": 2
            }, 
            {
                "distance": 694, 
                "guid": "6295db9d-6f1a-4a77-80ac-5cc767d7f12d", 
                "id": 3, 
                "yearsExp": 11, 
                "specialty": 11
            }, 
            {
                "distance": 135, 
                "guid": "69b6282d-f24f-4920-8260-c0ced03a8bf9", 
                "id": 4, 
                "yearsExp": 4, 
                "specialty": 13
            }, 
            {
                "distance": 52, 
                "guid": "63dab74e-d5b7-4228-9115-bcfaddd5bc41", 
                "id": 5, 
                "yearsExp": 22, 
                "specialty": 5
            }, 
            {
                "distance": 178, 
                "guid": "89caf153-3acd-448f-a170-119c3d04e269", 
                "id": 6, 
                "yearsExp": 7, 
                "specialty": 12
            }, 
            {
                "distance": 114, 
                "guid": "aa517e41-e650-4bea-ad9c-5ef944559c97", 
                "id": 7, 
                "yearsExp": 12, 
                "specialty": 3
            }, 
            {
                "distance": 23, 
                "guid": "35e4296c-a8c0-4ea9-9b0f-50279d83db75", 
                "id": 8, 
                "yearsExp": 12, 
                "specialty": 4
            }, 
            {
                "distance": 428, 
                "guid": "64a2f544-ef0c-451a-8cd0-55bc0b584a00", 
                "id": 9, 
                "yearsExp": 28, 
                "specialty": 13
            }, 
            {
                "distance": 483, 
                "guid": "075beffa-aa46-405a-835a-85a4d652f4ed", 
                "id": 10, 
                "yearsExp": 4, 
                "specialty": 12
            }, 
            {
                "distance": 629, 
                "guid": "dc69f339-cce8-4cbe-9fe3-a3909a4afb94", 
                "id": 11, 
                "yearsExp": 7, 
                "specialty": 11
            }, 
            {
                "distance": 62, 
                "guid": "39edc313-921b-4965-af3a-0191adf19cc3", 
                "id": 12, 
                "yearsExp": 30, 
                "specialty": 5
            }, 
            {
                "distance": 316, 
                "guid": "f4b83c94-00c5-41a2-8ba6-b1d4ecfc701a", 
                "id": 13, 
                "yearsExp": 29, 
                "specialty": 6
            }, 
            {
                "distance": 637, 
                "guid": "c8f50635-c37d-43a0-bfa6-537e5e84cccd", 
                "id": 14, 
                "yearsExp": 26, 
                "specialty": 6
            }, 
            {
                "distance": 415, 
                "guid": "454257e4-d105-480c-854c-ac9402cbd002", 
                "id": 15, 
                "yearsExp": 29, 
                "specialty": 12
            }, 
            {
                "distance": 675, 
                "guid": "71842963-40a9-43d9-92fc-f5a6fb435843", 
                "id": 16, 
                "yearsExp": 26, 
                "specialty": 14
            }, 
            {
                "distance": 607, 
                "guid": "e2a24d9c-8952-4c6d-8619-962aee12a15c", 
                "id": 17, 
                "yearsExp": 8, 
                "specialty": 14
            }, 
            {
                "distance": 685, 
                "guid": "a01168ab-f549-4e07-b810-234245475729", 
                "id": 18, 
                "yearsExp": 25, 
                "specialty": 14
            }, 
            {
                "distance": 465, 
                "guid": "508a5a87-1f9f-4382-804b-9a0e312dd7da", 
                "id": 19, 
                "yearsExp": 20, 
                "specialty": 3
            }, 
            {
                "distance": 216, 
                "guid": "777b4c23-a28a-48aa-b758-330ee6472139", 
                "id": 20, 
                "yearsExp": 21, 
                "specialty": 12
            }, 
            {
                "distance": 76, 
                "guid": "f3d0a4f6-bc63-406e-8192-688704fc8782", 
                "id": 21, 
                "yearsExp": 5, 
                "specialty": 10
            }, 
            {
                "distance": 95, 
                "guid": "0ee24442-bcb8-4ea5-bae6-d0ce7aa7f66a", 
                "id": 22, 
                "yearsExp": 25, 
                "specialty": 3
            }, 
            {
                "distance": 233, 
                "guid": "2de71d52-901a-41e5-8754-090131e80b19", 
                "id": 23, 
                "yearsExp": 4, 
                "specialty": 4
            }, 
            {
                "distance": 12, 
                "guid": "73ca1e96-b50e-4331-aa78-42fdd5d32b1a", 
                "id": 24, 
                "yearsExp": 5, 
                "specialty": 2
            }, 
            {
                "distance": 327, 
                "guid": "3984609e-1621-4cd4-b9cb-90a5aff39cc0", 
                "id": 25, 
                "yearsExp": 22, 
                "specialty": 10
            }, 
            {
                "distance": 113, 
                "guid": "b961294d-eff1-4870-9722-b4f64d171078", 
                "id": 26, 
                "yearsExp": 28, 
                "specialty": 7
            }, 
            {
                "distance": 73, 
                "guid": "2e5d760f-6d8b-457d-8d67-f965e3e9a16e", 
                "id": 27, 
                "yearsExp": 25, 
                "specialty": 13
            }, 
            {
                "distance": 294, 
                "guid": "ecc69317-980e-4193-bfd4-ae7edc5d004c", 
                "id": 28, 
                "yearsExp": 21, 
                "specialty": 12
            }, 
            {
                "distance": 468, 
                "guid": "cf5c012f-0ca6-4ef5-a231-eebe5a90a119", 
                "id": 29, 
                "yearsExp": 14, 
                "specialty": 10
            }, 
            {
                "distance": 583, 
                "guid": "4f269019-3807-464d-b9d7-9048a7b4b559", 
                "id": 30, 
                "yearsExp": 5, 
                "specialty": 2
            }, 
            {
                "distance": 570, 
                "guid": "5ef99e54-2365-48eb-9ce2-651712309dae", 
                "id": 31, 
                "yearsExp": 22, 
                "specialty": 12
            }, 
            {
                "distance": 291, 
                "guid": "c59cb80e-30e7-4c57-bd20-6477d225fd84", 
                "id": 32, 
                "yearsExp": 23, 
                "specialty": 15
            }, 
            {
                "distance": 584, 
                "guid": "cfa26542-38e0-44d5-8277-b14e7cc26d3f", 
                "id": 33, 
                "yearsExp": 18, 
                "specialty": 10
            }, 
            {
                "distance": 71, 
                "guid": "e68c1e52-fa21-4a22-a491-56840dbeeddf", 
                "id": 34, 
                "yearsExp": 12, 
                "specialty": 15
            }, 
            {
                "distance": 169, 
                "guid": "0084901f-40f6-4872-b5dd-389772d38ae5", 
                "id": 35, 
                "yearsExp": 4, 
                "specialty": 14
            }, 
            {
                "distance": 632, 
                "guid": "207ec591-25be-4978-a104-4a53f792056b", 
                "id": 36, 
                "yearsExp": 24, 
                "specialty": 10
            }, 
            {
                "distance": 530, 
                "guid": "a5299304-bf35-4b61-9150-fdf3a283fd96", 
                "id": 37, 
                "yearsExp": 16, 
                "specialty": 1
            }, 
            {
                "distance": 649, 
                "guid": "6a4d448e-0bfa-47ef-9150-a13b682a3391", 
                "id": 38, 
                "yearsExp": 19, 
                "specialty": 9
            }, 
            {
                "distance": 342, 
                "guid": "53dd001b-d7da-4fe3-94e9-7b7af291cedc", 
                "id": 39, 
                "yearsExp": 19, 
                "specialty": 4
            }, 
            {
                "distance": 117, 
                "guid": "d84b6904-595e-4800-abd8-dfd4d0100fc9", 
                "id": 40, 
                "yearsExp": 8, 
                "specialty": 9
            }, 
            {
                "distance": 247, 
                "guid": "a3a08c89-5f68-4043-b3f0-bd535fd3a00e", 
                "id": 41, 
                "yearsExp": 19, 
                "specialty": 11
            }, 
            {
                "distance": 97, 
                "guid": "0fc7b6fd-1db5-49fa-8213-cdef98263907", 
                "id": 42, 
                "yearsExp": 13, 
                "specialty": 11
            }, 
            {
                "distance": 555, 
                "guid": "7a4384b3-01f5-4fdb-89dc-30cb1cc19aa2", 
                "id": 43, 
                "yearsExp": 26, 
                "specialty": 10
            }, 
            {
                "distance": 646, 
                "guid": "e2a243e8-6b61-4a53-9f2b-a13803705a12", 
                "id": 44, 
                "yearsExp": 17, 
                "specialty": 12
            }, 
            {
                "distance": 300, 
                "guid": "4c002dad-3f29-46d5-9c76-225266335de1", 
                "id": 45, 
                "yearsExp": 14, 
                "specialty": 15
            }, 
            {
                "distance": 359, 
                "guid": "4d45bf2d-66f6-4fe5-b189-cc781b4d80e7", 
                "id": 46, 
                "yearsExp": 6, 
                "specialty": 8
            }, 
            {
                "distance": 265, 
                "guid": "3ef28d47-df46-419e-8be5-d2a61cbbc877", 
                "id": 47, 
                "yearsExp": 20, 
                "specialty": 10
            }, 
            {
                "distance": 191, 
                "guid": "7a5c2115-f002-492d-84a9-c5a74c213e9e", 
                "id": 48, 
                "yearsExp": 15, 
                "specialty": 6
            }, 
            {
                "distance": 129, 
                "guid": "2410d26e-fdd9-4158-8ea0-0abc02ca2392", 
                "id": 49, 
                "yearsExp": 12, 
                "specialty": 9
            }, 
            {
                "distance": 50, 
                "guid": "b0152eff-ae1a-40d4-9c85-4d03123d9ec6", 
                "id": 50, 
                "yearsExp": 8, 
                "specialty": 5
            }, 
            {
                "distance": 329, 
                "guid": "aa174ff6-e310-4c5d-a8f8-4a6aa8b7126c", 
                "id": 51, 
                "yearsExp": 5, 
                "specialty": 5
            }, 
            {
                "distance": 489, 
                "guid": "1e441375-9def-4086-94da-3d50c4945af9", 
                "id": 52, 
                "yearsExp": 27, 
                "specialty": 1
            }, 
            {
                "distance": 38, 
                "guid": "d2f0b3f3-3381-4519-bf68-233abc8cdcb1", 
                "id": 53, 
                "yearsExp": 29, 
                "specialty": 4
            }, 
            {
                "distance": 203, 
                "guid": "7fa6c00f-0ac7-4173-9616-d7b77f819db4", 
                "id": 54, 
                "yearsExp": 20, 
                "specialty": 1
            }, 
            {
                "distance": 504, 
                "guid": "f124d61b-cd51-41c2-af5c-ba0a7a5e6a9c", 
                "id": 55, 
                "yearsExp": 19, 
                "specialty": 11
            }, 
            {
                "distance": 614, 
                "guid": "1e46780b-0543-41c1-82a3-64a950eeb34b", 
                "id": 56, 
                "yearsExp": 8, 
                "specialty": 15
            }, 
            {
                "distance": 572, 
                "guid": "3b4c4f9a-6a87-44a7-9d75-450b0b0ba2d5", 
                "id": 57, 
                "yearsExp": 12, 
                "specialty": 15
            }, 
            {
                "distance": 442, 
                "guid": "cacdd9f7-c6e3-4f55-89d7-5b885f1a3532", 
                "id": 58, 
                "yearsExp": 29, 
                "specialty": 3
            }, 
            {
                "distance": 382, 
                "guid": "f5d8084f-bcb1-4c3a-91dc-6363497d3bdc", 
                "id": 59, 
                "yearsExp": 22, 
                "specialty": 4
            }, 
            {
                "distance": 699, 
                "guid": "72d0e6c1-fa05-48fb-915a-d811270f7775", 
                "id": 60, 
                "yearsExp": 20, 
                "specialty": 6
            }, 
            {
                "distance": 92, 
                "guid": "a6c36df0-5c67-419c-b59c-d070dd30d78e", 
                "id": 61, 
                "yearsExp": 30, 
                "specialty": 4
            }, 
            {
                "distance": 509, 
                "guid": "12e72ebe-5d46-4351-842b-8cd1f367df82", 
                "id": 62, 
                "yearsExp": 5, 
                "specialty": 13
            }, 
            {
                "distance": 107, 
                "guid": "662d9e4c-fe63-40db-a709-fe040ba3ccc9", 
                "id": 63, 
                "yearsExp": 19, 
                "specialty": 13
            }, 
            {
                "distance": 525, 
                "guid": "af1cc087-05fe-4cda-bc26-1c8b6c3e5be0", 
                "id": 64, 
                "yearsExp": 5, 
                "specialty": 14
            }, 
            {
                "distance": 552, 
                "guid": "df56456c-2ad4-4ce1-8aec-0bef9ed9d246", 
                "id": 65, 
                "yearsExp": 29, 
                "specialty": 6
            }, 
            {
                "distance": 675, 
                "guid": "15612cb8-2320-4898-8b49-65c519e57eb5", 
                "id": 66, 
                "yearsExp": 20, 
                "specialty": 11
            }, 
            {
                "distance": 193, 
                "guid": "9a580fc2-655e-450b-baee-923bdf635148", 
                "id": 67, 
                "yearsExp": 12, 
                "specialty": 10
            }, 
            {
                "distance": 185, 
                "guid": "b1d689a2-ed79-496f-bad1-b2495a17b684", 
                "id": 68, 
                "yearsExp": 22, 
                "specialty": 14
            }, 
            {
                "distance": 367, 
                "guid": "f7408a91-e5a1-41a3-96f4-d2b9659f3fc9", 
                "id": 69, 
                "yearsExp": 28, 
                "specialty": 9
            }, 
            {
                "distance": 326, 
                "guid": "61c213b6-8386-4dcb-8c88-f76499197843", 
                "id": 70, 
                "yearsExp": 22, 
                "specialty": 8
            }, 
            {
                "distance": 640, 
                "guid": "dd695c0c-3fbf-477e-982b-d3f0d39e06c1", 
                "id": 71, 
                "yearsExp": 30, 
                "specialty": 6
            }, 
            {
                "distance": 438, 
                "guid": "1714aa2d-66d9-44be-91ce-c4367c5f85d6", 
                "id": 72, 
                "yearsExp": 19, 
                "specialty": 5
            }, 
            {
                "distance": 32, 
                "guid": "264799a6-1abe-4a93-a1bb-14a27c220b4f", 
                "id": 73, 
                "yearsExp": 19, 
                "specialty": 2
            }, 
            {
                "distance": 403, 
                "guid": "996e1ada-44bf-43cd-9dc3-bae410ea6c2d", 
                "id": 74, 
                "yearsExp": 18, 
                "specialty": 9
            }, 
            {
                "distance": 394, 
                "guid": "24c5d1e8-ad3d-4fb9-b351-80b9c1e564f8", 
                "id": 75, 
                "yearsExp": 21, 
                "specialty": 14
            }, 
            {
                "distance": 552, 
                "guid": "afd9bbd6-ff7a-4a70-a05e-d5a43f80ded1", 
                "id": 76, 
                "yearsExp": 4, 
                "specialty": 1
            }, 
            {
                "distance": 430, 
                "guid": "d1190117-4e6b-41bb-a1e9-715cd5bf718d", 
                "id": 77, 
                "yearsExp": 17, 
                "specialty": 5
            }, 
            {
                "distance": 310, 
                "guid": "ef414983-893f-4e11-80b0-4a579e591a0e", 
                "id": 78, 
                "yearsExp": 22, 
                "specialty": 15
            }, 
            {
                "distance": 472, 
                "guid": "bebe136e-e1c5-43cc-8154-ddb1c4868326", 
                "id": 79, 
                "yearsExp": 21, 
                "specialty": 6
            }, 
            {
                "distance": 646, 
                "guid": "3431ad7d-c9c7-496d-b8c9-cc1f5d05340e", 
                "id": 80, 
                "yearsExp": 27, 
                "specialty": 5
            }, 
            {
                "distance": 348, 
                "guid": "b1bb4f56-5d71-4127-8c1e-874b5cb027f8", 
                "id": 81, 
                "yearsExp": 5, 
                "specialty": 11
            }, 
            {
                "distance": 188, 
                "guid": "98d02e4a-6c85-4bac-91a8-5f5d938008fc", 
                "id": 82, 
                "yearsExp": 22, 
                "specialty": 14
            }, 
            {
                "distance": 337, 
                "guid": "a91f9a42-8431-4c1f-a3e2-943a1aef2ba6", 
                "id": 83, 
                "yearsExp": 11, 
                "specialty": 12
            }, 
            {
                "distance": 420, 
                "guid": "933f5fbd-2af2-4ea5-a2c7-2c08a7025890", 
                "id": 84, 
                "yearsExp": 23, 
                "specialty": 6
            }, 
            {
                "distance": 618, 
                "guid": "a88d1ffb-3c9c-46c6-b133-4f0b11edbedb", 
                "id": 85, 
                "yearsExp": 15, 
                "specialty": 12
            }, 
            {
                "distance": 197, 
                "guid": "45ee14d5-5c5d-4ab7-8a3f-ca3bf74c1472", 
                "id": 86, 
                "yearsExp": 17, 
                "specialty": 2
            }, 
            {
                "distance": 221, 
                "guid": "a4120d5c-10eb-4da4-a74c-41035b913010", 
                "id": 87, 
                "yearsExp": 10, 
                "specialty": 6
            }, 
            {
                "distance": 233, 
                "guid": "679601f3-043d-49f9-b775-150dbb2e2ef5", 
                "id": 88, 
                "yearsExp": 17, 
                "specialty": 3
            }, 
            {
                "distance": 201, 
                "guid": "7352737e-29ab-4884-b807-5b5c71944682", 
                "id": 89, 
                "yearsExp": 23, 
                "specialty": 1
            }, 
            {
                "distance": 413, 
                "guid": "5e52d61d-61bf-462b-9d53-136cf674ba15", 
                "id": 90, 
                "yearsExp": 25, 
                "specialty": 5
            }, 
            {
                "distance": 33, 
                "guid": "c13aad63-c640-42ca-96ce-5afd8aaeb2ad", 
                "id": 91, 
                "yearsExp": 6, 
                "specialty": 6
            }, 
            {
                "distance": 254, 
                "guid": "f2719f3a-0d91-4165-b889-6ef755bb87d3", 
                "id": 92, 
                "yearsExp": 18, 
                "specialty": 4
            }, 
            {
                "distance": 304, 
                "guid": "e78b3a89-6c80-41de-bb7c-d89e6ffd229e", 
                "id": 93, 
                "yearsExp": 19, 
                "specialty": 11
            }, 
            {
                "distance": 278, 
                "guid": "bf97fa39-c5bc-4a2d-9f2c-c0cb1b9c7094", 
                "id": 94, 
                "yearsExp": 14, 
                "specialty": 13
            }, 
            {
                "distance": 239, 
                "guid": "b2865994-a1e6-4e02-b030-18abdc8594c0", 
                "id": 95, 
                "yearsExp": 28, 
                "specialty": 10
            }, 
            {
                "distance": 509, 
                "guid": "c662f2be-e0d8-439d-a1ab-16d2020cbe72", 
                "id": 96, 
                "yearsExp": 17, 
                "specialty": 5
            }, 
            {
                "distance": 118, 
                "guid": "cbc56a36-ad5f-42aa-8043-3747e4c5ca3a", 
                "id": 97, 
                "yearsExp": 23, 
                "specialty": 12
            }, 
            {
                "distance": 179, 
                "guid": "36b86896-c913-4410-9ddc-7ac07215cecb", 
                "id": 98, 
                "yearsExp": 27, 
                "specialty": 1
            }, 
            {
                "distance": 570, 
                "guid": "07eef040-3458-4ebf-9b84-3b9e6b1c3f7e", 
                "id": 99, 
                "yearsExp": 5, 
                "specialty": 11
            }, 
            {
                "distance": 671, 
                "guid": "a4979d34-44cd-4a99-8d43-4bee4f3dda58", 
                "id": 100, 
                "yearsExp": 22, 
                "specialty": 6
            }, 
            {
                "distance": 632, 
                "guid": "402f6d23-13ec-4114-b36c-723cc530693d", 
                "id": 101, 
                "yearsExp": 24, 
                "specialty": 1
            }, 
            {
                "distance": 249, 
                "guid": "1eb9fe0a-b807-41c0-bfb2-ff1eda204e47", 
                "id": 102, 
                "yearsExp": 19, 
                "specialty": 14
            }, 
            {
                "distance": 215, 
                "guid": "ff119ca1-2383-4d4e-b35e-546160e2f574", 
                "id": 103, 
                "yearsExp": 12, 
                "specialty": 15
            }, 
            {
                "distance": 700, 
                "guid": "c49ac2d4-2146-4c0f-ba3f-930d8a1c20be", 
                "id": 104, 
                "yearsExp": 16, 
                "specialty": 13
            }, 
            {
                "distance": 423, 
                "guid": "f1d51a5e-e6e2-42ab-86bf-76f5bfa2be15", 
                "id": 105, 
                "yearsExp": 22, 
                "specialty": 12
            }, 
            {
                "distance": 27, 
                "guid": "2c0da423-7ec8-4af2-b4a2-b1b8165da6d5", 
                "id": 106, 
                "yearsExp": 21, 
                "specialty": 9
            }, 
            {
                "distance": 559, 
                "guid": "0f91d54a-3246-45b1-b570-c4a79deaa557", 
                "id": 107, 
                "yearsExp": 28, 
                "specialty": 3
            }, 
            {
                "distance": 116, 
                "guid": "8317c959-ee9f-45c3-8155-02a5a2040249", 
                "id": 108, 
                "yearsExp": 4, 
                "specialty": 7
            }, 
            {
                "distance": 254, 
                "guid": "52b4abde-c3e4-4e81-83cc-b5a66cfbfc04", 
                "id": 109, 
                "yearsExp": 12, 
                "specialty": 5
            }, 
            {
                "distance": 669, 
                "guid": "aefc175b-3e07-497a-8014-584e3a908cff", 
                "id": 110, 
                "yearsExp": 26, 
                "specialty": 7
            }, 
            {
                "distance": 560, 
                "guid": "43cd0222-3a39-466f-8bde-dba5ce2712f3", 
                "id": 111, 
                "yearsExp": 28, 
                "specialty": 5
            }, 
            {
                "distance": 149, 
                "guid": "f8486f3d-ba05-43a0-8327-759ebb33833b", 
                "id": 112, 
                "yearsExp": 18, 
                "specialty": 12
            }, 
            {
                "distance": 27, 
                "guid": "717ebe30-8693-431b-922a-79721e1e2c5d", 
                "id": 113, 
                "yearsExp": 30, 
                "specialty": 4
            }, 
            {
                "distance": 477, 
                "guid": "4f20a6b5-d965-47e7-8494-ef57e102ba0e", 
                "id": 114, 
                "yearsExp": 22, 
                "specialty": 1
            }, 
            {
                "distance": 99, 
                "guid": "eb371e8b-efdb-40f3-9c25-05baa1ec5a3a", 
                "id": 115, 
                "yearsExp": 22, 
                "specialty": 7
            }, 
            {
                "distance": 635, 
                "guid": "b5ea6163-0d8f-4346-a33b-fa8515ff94c3", 
                "id": 116, 
                "yearsExp": 17, 
                "specialty": 9
            }, 
            {
                "distance": 393, 
                "guid": "4c028a9e-917a-4492-94be-77285214728c", 
                "id": 117, 
                "yearsExp": 8, 
                "specialty": 6
            }, 
            {
                "distance": 405, 
                "guid": "2e491650-c5b5-4f6a-9473-7c099b21995c", 
                "id": 118, 
                "yearsExp": 13, 
                "specialty": 11
            }, 
            {
                "distance": 340, 
                "guid": "7708ebdb-538f-4c96-b3f2-b980022d0d28", 
                "id": 119, 
                "yearsExp": 13, 
                "specialty": 15
            }, 
            {
                "distance": 427, 
                "guid": "5562f2b6-5582-44f5-8b13-9f094c5e327a", 
                "id": 120, 
                "yearsExp": 25, 
                "specialty": 8
            }, 
            {
                "distance": 564, 
                "guid": "ef71ef8f-91e4-4793-9986-d9952b961d36", 
                "id": 121, 
                "yearsExp": 7, 
                "specialty": 11
            }, 
            {
                "distance": 206, 
                "guid": "67e519e0-144f-49a7-8bb9-47840cb79017", 
                "id": 122, 
                "yearsExp": 10, 
                "specialty": 5
            }
        ]