var color_choices = [
    "#FF00FF",
    "#8622FF",
    "#FE0056",
    "#00FFCE",
    "#FF8000",
    "#00B7EB",
    "#FFFF00",
    "#0E7AFE",
    "#FFABAB",
    "#0000FF",
    "#CCCCCC",
];
// if you want choices to be kind of random, shuffle the array once here

var radiansPer45Degrees = Math.PI / 4;

var padding = 30;
var imageContainer = document.querySelector('.image-container');
var canvas = document.getElementById('canvas');
var mainCtx = canvas.getContext('2d');
var offScreenCanvas = document.createElement('canvas');
var offScreenCtx = offScreenCanvas.getContext('2d');
offScreenCanvas.width = canvas.width + padding * 2;
offScreenCanvas.height = canvas.height + padding * 2;

var img = new Image();
var rgb_color = color_choices[0];
var fill_color = 'rgba(0,0,0,0.35)';

var scaleFactor = 1;
var scaleSpeed = 0.01;

var points = [];
var masterPoints = [];
var masterColors = [];
var input = document.querySelector('input[type="file"]');

var drawMode;
setDrawMode('polygon');
var constrainAngles = false;
var showNormalized = false;

function resetState() {
    points = [];
    masterPoints = [];
    masterColors = [];
    rgb_color = color_choices[0];
    document.querySelector('#json').innerHTML = '';
    document.querySelector('#lua').innerHTML = '';
}


var isFullscreen = false;
var taskbarAndCanvas = document.querySelector('.right');

var editMode = false;
var selectedPointIndex = -1;
var selectedPolygonIndex = -1;


function blitCachedCanvas() {
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    mainCtx.drawImage(offScreenCanvas, 0, 0);
    mainCtx.lineWidth = 1;
    mainCtx.strokeStyle = '#333333';
    mainCtx.rect(padding, padding, img.width, img.height);
    mainCtx.stroke();
    mainCtx.lineWidth = 5;
    mainCtx.strokeStyle = color_choices[0];
}

function clipboard(selector) {
    var copyText = document.querySelector(selector).innerText;
    // strip whitespace on left and right
    copyText = copyText.replace(/^\s+|\s+$/g, '');
    navigator.clipboard.writeText(copyText);
}

function clearDrawings() {
    offScreenCtx.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
    blitCachedCanvas();
}

function isClockwise(vertices) {
    let sum = 0;
    for (let i = 0; i < vertices.length; i++) {
        const [x1, y1] = vertices[i];
        const [x2, y2] = vertices[(i + 1) % vertices.length];
        sum += (x2 - x1) * (y2 + y1);
    }
    return sum > 0;
}

function zoom(clicks) {
    var newScaleFactor = scaleFactor + clicks * scaleSpeed;
    newScaleFactor = Math.max(0.1, Math.min(newScaleFactor, 1));

    const maxWidth = imageContainer.offsetWidth * 0.95;
    const maxHeight = imageContainer.offsetHeight * 0.95;

    let newWidth = img.width * newScaleFactor;
    let newHeight = img.height * newScaleFactor;

    if (newWidth > maxWidth) {
        newHeight = (maxWidth / newWidth) * newHeight;
        newWidth = maxWidth;
        newScaleFactor = newWidth / img.width;
    }

    if (newHeight > maxHeight) {
        newWidth = (maxHeight / newHeight) * newWidth;
        newHeight = maxHeight;
        newScaleFactor = newHeight / img.height;
    }

    scaleFactor = newScaleFactor;
    canvas.style.width = newWidth + 'px';
    canvas.style.height = newHeight + 'px';
}

function onPathClose() {
    canvas.style.cursor = 'default';
    // we do this to avoid clearing overlapping polygons
    if (isClockwise(points)) {
        points = points.reverse();
    }
    masterPoints.push(points);
    points = [];
    masterColors.push(rgb_color);
    drawAllPolygons(offScreenCtx);
    blitCachedCanvas();
    rgb_color = color_choices[(masterColors.length) % (color_choices.length)];
}

// placeholder image
img.src = 'default.png';
img.onload = function() {
    canvas.style.width = img.width + padding * 2;
    canvas.style.height = img.height + padding * 2;
    canvas.width = img.width + padding * 2;
    canvas.height = img.height + padding * 2;
    offScreenCanvas.width = img.width + padding * 2;
    offScreenCanvas.height = img.height + padding * 2;
    offScreenCtx.drawImage(img, 0, 0);
    mainCtx.width = img.width + padding * 2;
    mainCtx.height = img.height + padding * 2;
    blitCachedCanvas();
};

function makeLine(ctx, x1, y1, x2, y2) {
    [x1, y1] = getClampedCoords(x1, y1);
    [x2, y2] = getClampedCoords(x2, y2);
    ctx.moveTo(x1 + padding, y1 + padding);
    ctx.lineTo(x2 + padding, y2 + padding);
}

function drawNode(ctx, x, y, stroke = null) {
    if (stroke) {
        ctx.strokeStyle = stroke;
    }
    [x, y] = getClampedCoords(x, y);
    ctx.beginPath();
    ctx.arc(x + padding, y + padding, 5, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = 'white';
    ctx.fill();
    ctx.stroke();
}

function getClampedCoords(x, y) {
    if (x < 0) {
        x = 0;
    }
    if (y < 0) {
        y = 0;
    }
    if (x > img.width) {
        x = img.width;
    }
    if (y > img.height) {
        y = img.height;
    }
    return [x, y];
}

function getScaledCoords(e) {
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left - padding;
    var y = e.clientY - rect.top - padding;
    return [x / scaleFactor, y / scaleFactor];
}

function drawAllPolygons(ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, padding, padding);
    // draw polygons as subpaths and fill all at once
    // we do this to avoid overlapping polygons becoming opaque
    ctx.beginPath();
    ctx.fillStyle = fill_color;
    for (var i = 0; i < masterPoints.length; i++) {
        var newpoints = masterPoints[i];
        for (var j = 1; j < newpoints.length; j++) {
            makeLine(ctx, newpoints[j - 1][0], newpoints[j - 1][1], newpoints[j][0], newpoints[j][1]);
            ctx.moveTo(newpoints[0][0] + padding, newpoints[0][1] + padding);
            for (var j = 1; j < newpoints.length; j++) {
                ctx.lineTo(newpoints[j][0] + padding, newpoints[j][1] + padding);
            }
            makeLine(ctx, newpoints[newpoints.length - 1][0], newpoints[newpoints.length - 1][1], newpoints[0][0], newpoints[0][1]);
        }
    }
    ctx.fill();

    ctx.lineWidth = 5;
    ctx.lineJoin = 'bevel';
    for (var i = 0; i < masterPoints.length; i++) {
        var newpoints = masterPoints[i];
        ctx.strokeStyle = masterColors[i];

        ctx.beginPath();
        for (var j = 1; j < newpoints.length; j++) {
            makeLine(ctx, newpoints[j - 1][0], newpoints[j - 1][1], newpoints[j][0], newpoints[j][1]);
            ctx.moveTo(newpoints[0][0] + padding, newpoints[0][1] + padding);
            for (var j = 1; j < newpoints.length; j++) {
                ctx.lineTo(newpoints[j][0] + padding, newpoints[j][1] + padding);
            }
        }
        ctx.closePath();
        ctx.stroke();

        // draw arc around each point
        for (var j = 0; j < newpoints.length; j++) {
            drawNode(ctx, newpoints[j][0], newpoints[j][1]);
        }
    }
}

function getParentPoints() {
    var parentPoints = [];
    for (var i = 0; i < masterPoints.length; i++) {
        masterPoints[i]
        parentPoints.push(masterPoints[i]);
    }
    parentPoints.push(points);
    return parentPoints;
}

function findClosestPoint(x, y) {
    let minDist = Infinity;
    let closestPoint = null;
    let polygonIndex = -1;
    let pointIndex = -1;

    for (let i = 0; i < masterPoints.length; i++) {
        for (let j = 0; j < masterPoints[i].length; j++) {
            const [px, py] = masterPoints[i][j];
            const dist = Math.sqrt((x - px) ** 2 + (y - py) ** 2);
            if (dist < minDist && dist < 10 / scaleFactor) { // grab radius
                minDist = dist;
                closestPoint = [px, py];
                polygonIndex = i;
                pointIndex = j;
            }
        }
    }

    return {
        point: closestPoint,
        polygonIndex,
        pointIndex
    };
}

window.addEventListener('keyup', function(e) {
    if (e.key === 'Shift') {
        constrainAngles = false;
    }
});

document.querySelector('#copyLuaButton').addEventListener('click', function(e) {
    clipboard("#lua");
    e.preventDefault();
});

document.querySelector('#copyJSONButton').addEventListener('click', function(e) {
    clipboard("#json");
    e.preventDefault();
});

canvas.addEventListener('dragover', function(e) {
    e.preventDefault();
});

canvas.addEventListener('wheel', function(e) {
    e.preventDefault()
    var delta = Math.sign(e.deltaY);
    zoom(delta);
});

canvas.addEventListener('mouseleave', function(e) {
    var xcoord = document.querySelector('#x');
    var ycoord = document.querySelector('#y');
    xcoord.innerHTML = '';
    ycoord.innerHTML = '';
});

canvas.addEventListener('mousemove', function(e) {
    var [x, y] = getScaledCoords(e);
    x = Math.round(x);
    y = Math.round(y);

    // update x y coords
    var xcoord = document.querySelector('#x');
    var ycoord = document.querySelector('#y');

    if (constrainAngles && points.length > 0) {
        var lastPoint = points[points.length - 1];
        var dx = x - lastPoint[0];
        var dy = y - lastPoint[1];
        var angle = Math.atan2(dy, dx);
        var length = Math.sqrt(dx * dx + dy * dy);
        const snappedAngle = Math.round(angle / radiansPer45Degrees) * radiansPer45Degrees;
        var new_x = lastPoint[0] + length * Math.cos(snappedAngle);
        var new_y = lastPoint[1] + length * Math.sin(snappedAngle);
        x = Math.round(new_x);
        y = Math.round(new_y);
    }

    // sometimes, a mousemove event is leaving the canvas and has coordinates outside the canvas
    // however, due to the cursors being used, we do not need to check if it is larger than canvas.width or canvas.height
    if (x < 0 || y < 0) {
        xcoord.innerHTML = '';
        ycoord.innerHTML = '';
        return;
    }
    xcoord.innerHTML = x;
    ycoord.innerHTML = y;

    var coord_count = document.querySelector('#cc-count');
    coord_count.innerHTML = getParentPoints()[0].length;

    var ctx = mainCtx;
    ctx.lineWidth = 5;
    ctx.lineJoin = 'bevel';
    ctx.fillStyle = 'white';

    // if cursor is crosshair, draw line from last point to cursor
    if (canvas.style.cursor == 'crosshair') {
        blitCachedCanvas();

        for (var i = 0; i < points.length - 1; i++) {
            ctx.strokeStyle = rgb_color;
            ctx.beginPath();
            ctx.lineJoin = 'bevel';
            makeLine(ctx, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
            ctx.closePath();
            ctx.stroke();

            drawNode(ctx, points[i][0], points[i][1]);
        }


        if ((points.length > 0 && drawMode == "polygon") || (points.length > 0 && points.length < 2 && drawMode == "line")) {
            ctx.beginPath();
            ctx.lineJoin = 'bevel';
            ctx.strokeStyle = rgb_color;
            makeLine(ctx, points[points.length - 1][0], points[points.length - 1][1], x, y);
            ctx.closePath();
            ctx.stroke();

            drawNode(ctx, points[i][0], points[i][1]);
        }
    }

    if (editMode && selectedPointIndex !== -1) {
        masterPoints[selectedPolygonIndex][selectedPointIndex] = [x, y];
        drawAllPolygons(offScreenCtx);
        blitCachedCanvas();
        writePoints(getParentPoints());
    }
});

canvas.addEventListener('drop', function(e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    processAndDisplayImage(file);
});

// function to process uploading image file through form instead of drag and drop
document.querySelector("#upload-file").addEventListener('submit', (e) => {
    e.preventDefault();
    var file = input.files[0];
    processAndDisplayImage(file);
});

// This function abstracts away the logic to read and verify the image file, allowing it to be used by both the
// drop method, and the upload a file form method
function processAndDisplayImage(file) {
    var reader = new FileReader();

    reader.onload = function(event) {
        // only allow image files
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);

    var mime_type = file.type;

    if (
        mime_type != 'image/png' &&
        mime_type != 'image/jpeg' &&
        mime_type != 'image/jpg'
    ) {
        alert('Only PNG, JPEG, and JPG files are allowed.');
        return;
    }

    img.onload = function() {
        canvas.style.width = (img.width + padding * 2) + 'px';
        canvas.style.height = (img.height + padding * 2) + 'px';
        canvas.width = img.width + padding * 2;
        canvas.height = img.height + padding * 2;
        canvas.style.borderRadius = '10px';
        offScreenCanvas.width = img.width + padding * 2;
        offScreenCanvas.height = img.height + padding * 2;
        offScreenCtx.drawImage(img, padding, padding);
        blitCachedCanvas();
    };
    // show coords
    //document.getElementById('coords').style.display = 'inline-block';
}

function writePoints(parentPoints) {
    var normalized = [];

    // if normalized is true, normalize all points
    var imgHeight = img.height;
    var imgWidth = img.width;
    if (showNormalized) {
        for (var i = 0; i < parentPoints.length; i++) {
            var normalizedPoints = [];
            for (var j = 0; j < parentPoints[i].length; j++) {
                norm_x = Math.round(parentPoints[i][j][0] / imgWidth * 100) / 100;
                norm_y = Math.round(parentPoints[i][j][1] / imgHeight * 100) / 100;
                normalizedPoints.push([norm_x, norm_y]);
            }
            normalized.push(normalizedPoints);
        }
        parentPoints = normalized;
    } else {
        for (var i = 0; i < parentPoints.length; i++) {
            var normalizedPoints = [];
            for (var j = 0; j < parentPoints[i].length; j++) {
                [norm_x, norm_y] = getClampedCoords(parentPoints[i][j][0], parentPoints[i][j][1]);
                normalizedPoints.push([norm_x, norm_y]);
            }
            normalized.push(normalizedPoints);
        }
        parentPoints = normalized;
    }

    // clean empty points
    parentPoints = parentPoints.filter(points => !!points.length);

    if (!parentPoints.length) {
        document.querySelector('#lua').innerHTML = '';
        document.querySelector('#json').innerHTML;
        return;
    }

    // create np.array list
    var code_template = `${parentPoints.map(function(points) {
                            return `${points.map(function(point) {
                                return `${point[0]}, ${point[1]}`;}).join(', ')}`;
                            })}`;

    document.querySelector('#lua').innerHTML = '{ ' + code_template + ' }';

    var json_template = `{\n${parentPoints.map(function(points) {
        return `    [${points.map(function(point) {
            return `{"x": ${point[0]}, "y": ${point[1]}}`;}).join(', ')}]`;
        }).join(',\n')}\n}`;

    document.querySelector('#json').innerHTML = json_template;
}

canvas.addEventListener('mousedown', function(e) {
    var [x, y] = getScaledCoords(e);
    x = Math.round(x);
    y = Math.round(y);

    if (editMode) {
        const {
            point,
            polygonIndex,
            pointIndex
        } = findClosestPoint(x, y);
        if (point) {
            selectedPointIndex = pointIndex;
            selectedPolygonIndex = polygonIndex;
            canvas.style.cursor = 'grabbing';
        }
    } else {
        // click handling for drawing mode
        canvas.style.cursor = 'crosshair';

        if (constrainAngles && points.length > 0) {
            var lastPoint = points[points.length - 1];
            var dx = x - lastPoint[0];
            var dy = y - lastPoint[1];
            var angle = Math.atan2(dy, dx);
            var length = Math.sqrt(dx * dx + dy * dy);
            const snappedAngle = Math.round(angle / radiansPer45Degrees) * radiansPer45Degrees;
            var new_x = lastPoint[0] + length * Math.cos(snappedAngle);
            var new_y = lastPoint[1] + length * Math.sin(snappedAngle);
            x = Math.round(new_x);
            y = Math.round(new_y);
        }

        if (points.length > 2 && drawMode == "polygon") {
            distX = x - points[0][0];
            distY = y - points[0][1];
            // stroke is 3px and centered on the circle (i.e. 1/2 * 3px) and arc radius is
            if (Math.sqrt(distX * distX + distY * distY) <= 6.5) {
                onPathClose();
                return;
            }
        }

        points.push([x, y]);

        drawNode(mainCtx, x, y, rgb_color);

        if (drawMode == "line" && points.length == 2) {
            onPathClose();
        }

        writePoints(getParentPoints());
        var coord_count = document.querySelector('#cc-count');
        coord_count.innerHTML = getParentPoints()[0].length;
    }
});

canvas.addEventListener('mouseup', function(e) {
    if (editMode) {
        selectedPointIndex = -1;
        selectedPolygonIndex = -1;
        canvas.style.cursor = 'move';
    }
});

document.querySelector('#normalize-checkbox').addEventListener('change', function(e) {
    showNormalized = e.target.checked;
    var parentPoints = getParentPoints();
    writePoints(getParentPoints());
});

function setDrawMode(mode) {
    drawMode = mode;
    setEditMode(false);
    canvas.style.cursor = 'crosshair';
    document.querySelectorAll('.t-mode').forEach(el => el.classList.remove('active'));
    document.querySelector(`#mode-${mode}`).classList.add('active');
}

function setEditMode(editEnabled) {
    editMode = editEnabled;
    canvas.style.cursor = editEnabled ? 'move' : 'crosshair';
    document.querySelectorAll('.t-mode').forEach(el => el.classList.remove('active'));
    document.querySelector(`#mode-${editEnabled ? 'edit' : drawMode}`).classList.add('active');
}

document.querySelector('#mode-polygon').addEventListener('click', function(e) {
    setDrawMode('polygon');
})

document.querySelector('#mode-line').addEventListener('click', function(e) {
    setDrawMode('line');
})

document.querySelector('#mode-edit').addEventListener('click', function(e) {
    setEditMode(true);
});

document.addEventListener('keydown', function(e) {
    if (e.key == 'l' || e.key == 'L') {
        setDrawMode('line');
    }
    if (e.key == 'p' || e.key == 'P') {
        setDrawMode('polygon');
    }
    if (e.key == 'e' || e.key == 'E') {
        setEditMode(true);
    }
});

function rewritePoints() {
    writePoints(getParentPoints());
}

function highlightButtonInteraction(buttonId) {
    document.querySelector(buttonId).classList.add('active');
    setTimeout(() => document.querySelector(buttonId).classList.remove('active'), 100);
}

function undo() {
    highlightButtonInteraction('#undo');

    if (points.length > 0) {
        points.pop();
        blitCachedCanvas();
        rewritePoints();

        if (points.length === 0) {
            return;
        }

        var ctx = mainCtx;
        ctx.strokeStyle = rgb_color;
        ctx.fillStyle = 'white';
        if (points.length === 1) {
            drawNode(ctx, points[0][0], points[0][1]);
        } else {
            drawNode(ctx, points[0][0], points[0][1]);
            for (var i = 0; i < points.length - 1; i++) {
                makeLine(ctx, points[i][0], points[i][1], points[i + 1][0], points[i + 1][1]);
                ctx.stroke();
                drawNode(ctx, points[i + 1][0], points[i + 1][1]);
            }
        }
    }
}

document.querySelector('#undo').addEventListener('click', function(e) {
    undo();
})

function discardCurrentPolygon() {
    highlightButtonInteraction('#discard-current');
    points = [];
    blitCachedCanvas();
    rewritePoints();
}

document.querySelector('#discard-current').addEventListener('click', function(e) {
    discardCurrentPolygon();
})

function clearAll() {
    highlightButtonInteraction('#clear')
    resetState();
    // reset main and offscreen canvases
    mainCtx.clearRect(0, 0, canvas.width, canvas.height);
    offScreenCtx.clearRect(0, 0, offScreenCanvas.width, offScreenCanvas.height);
    mainCtx.drawImage(img, padding, padding);
    offScreenCtx.drawImage(img, padding, padding);
    points = [];
    masterPoints = [];
    masterColors = [];
    rgb_color = color_choices[0];
    document.querySelector('#jsonCode').innerHTML = '';
    document.querySelector('#luaCode').innerHTML = '';
}

document.querySelector('#clear').addEventListener('click', function(e) {
    clearAll();
})

function saveImage() {
    highlightButtonInteraction('#save-image');

    var link = document.createElement('a');
    link.download = 'image.png';
    link.href = canvas.toDataURL();
    link.click();
}

document.querySelector('#save-image').addEventListener('click', function(e) {
    saveImage();
})

function toggleFullscreen() {
    highlightButtonInteraction('#fullscreen');

    if (!isFullscreen) {
        if (taskbarAndCanvas.requestFullscreen) {
            taskbarAndCanvas.requestFullscreen();
        } else if (taskbarAndCanvas.webkitRequestFullscreen) { // Safari
            taskbarAndCanvas.webkitRequestFullscreen();
        } else if (taskbarAndCanvas.msRequestFullscreen) { // IE/Edge
            taskbarAndCanvas.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.webkitExitFullscreen) { // Safari
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { // IE/Edge
            document.msExitFullscreen();
        }
    }
}

document.addEventListener('fullscreenchange', function() {
    isFullscreen = document.fullscreenElement !== null;
});

document.querySelector('#fullscreen').addEventListener('click', function(e) {
    toggleFullscreen();
});

window.addEventListener('keydown', function(e) {
    if (e.key === 'z' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        undo();
    }

    if (e.key === 'Shift') {
        constrainAngles = true;
    }

    if (e.key === 'Escape') {
        discardCurrentPolygon();
    }

    if (e.key === 'e' && (e.ctrlKey || e.metaKey)) {
        clearAll();
    }

    if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        e.stopImmediatePropagation();

        saveImage();
    }

    if (e.key === 'Enter') {
        if (points.length > 2) {
            onPathClose();
        }
    }

    if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
    }
})