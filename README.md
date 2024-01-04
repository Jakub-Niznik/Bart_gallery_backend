This project is based on this API: http://api.programator.sk/docs#

To start server: run www file located in bin.
It is necessary to install express, path, fs, multer, sharp and zip-local with npm.

npm install express
npm install --save path
npm install --save file-system
npm install multer
npm install sharp
npm install zip-local


Bonus: Request GET: http://localhost:3000/gallery/download/"name_of_gallery" - will compress and send gallery to client (user can download whole compressed gallery).
