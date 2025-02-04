## Improved PolygonZone editor for Lua games
This web app helps you to create polygon contours of images such as textures or sprites and use them in LÖVE / Love 2D framework for polygon shapes. You can easily create new bodies and fixtures from polygon shapes exported from this editor.

This process is also called mapping image to polygon, polygon contours or how to convert image to polygon shape with X,Y coordinates.

Feel free to improve.

**This update changes output to standardized Lua table coordinates such as `{120, 4, 5, 30, 45, 60}` and similar.**

### Changes
1. Lua table output of vertices (coordinates / points)
2. Vertex counter (due to Box2D limit of 8 vertices per polygon)
3. UI / UX improvement - 30 padding around all image sides, where polygon editing still works (originally cursor would dissappear there)
4. Automatic snapping to image width/height for polygon vertex, when created inside padding area
5. All external/remote files saved loally, so it works fully offline

See original repo at:
https://github.com/roboflow/polygonzone