# Feature-centric Ranking of Georeferenced Videos

## Preliminaries

This piece of software was developed as part of a master thesis at the Institute for Geoinformatics of the University Münster.

## Installation 

1.  Download this repository and unpack it.
2.  Download and install Node.js on you computer.
3.  Open a shell and navigate to the project directory.
4.  Run ```npm install``` to download and install all required modules.
5.  Run `node app.js` to start the system

## Configuration

The application needs to be configured to your local environment in order to work. It needs the connection information of the video database which serves the desired data. Moreover, the file directory holding the videos needs to be configured so that they can be viewed in the application. The associated parameters can be found within the head section of the *app.js* file. Set the value of 
the variable *dbConnectionString* to the connection string of your database. Then, set *fovTableName* to the name of the table holding the FOV information. Finally, set *video_directory* to the location under which the videos referenced by the database can be found. 
