Parse.initialize("89Aw77ZkLf3hvZqrcGDTXqZMokAdIlqTmY14z5XR", "gdVSvclZRBkad6tQrHQxoBC4IaZUdjbHRgFMPieG");

//global event list
var events;
var output = [];

function handleFileSelect(evt) {
    var files = evt.target.files; // FileList object
    var file = files[0];
    if (file.name.split('.').pop() != "ics"){
       alert("Invalid file format.  Please upload an ics file.");
       return;
    }
    // files is a FileList of File objects. List some properties.
    for (var i = 0, f; f = files[i]; i++) {
      output.push('<li><strong>', escape(f.name), '</strong> (', f.type || 'n/a', ') - ',f.size, ' bytes</li>');
    }
    updateDisplay();


    var reader = new FileReader();

    // Closure to capture the file information.
    reader.onload = (function(file) {
        return function(e) {
            new ical_parser(e.target.result, function(cal){
                events = cal.getEvents();
                //ics groups classes that repeat throughout the week, so check for repeating classes
                //temp copy for looping, since we are growing the array on iteration
                var tempEvents = events.slice();
                
                for (var i = 0; i < tempEvents.length; i++) {
                	checkIfRepeats(events[i]);
                };
                //sort events by start date
                events.sort(compareEvent("DTSTART"));
                //now the fun begins
                output.push('<ul>');
                for (var i = 0; i < events.length; i++) {
                	output.push('<li>',events[i].SUMMARY,' - <strong>', events[i].LOCATION, '</strong> ',events[i].DTSTART.toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'}),' - ',events[i].DTEND.toLocaleTimeString(navigator.language, {hour: '2-digit', minute:'2-digit'}),'</li>');
                	output.push('<span id='+i+'></span>');
                    setGroup(i);
                }
                output.push('<ul>');
                updateDisplay();
            });
        }
    })(file);
    reader.readAsText(file);


}

function setGroup(idx){
    //keyword is the first word of the location
    var keyword = events[idx].LOCATION.split(" ")[0];
    var Building = Parse.Object.extend("Building");
    var query = new Parse.Query(Building);
    query.equalTo("keyword",keyword);
    query.find({
      success: function(results) {
        events[idx].group = results[0].get("group");
        //set transit time if needed
        if(idx != 0 && events[idx].DTSTART.getDay() == events[idx-1].DTSTART.getDay()){
            var time = timeInTransit(events[idx].group,events[idx-1].group);
            $("#"+(idx-1)).append("<ul>Travel time = "+time+" minutes</ul>")
        }
      },
      error: function(error) {
        //issue
      }
    });
}

function updateDisplay(){
   $("#content").append(output.join(''));
    output = [];
}

function timeInTransit(from,to){
	var array = [from,to];
	switch (array.join(" ")){
		case '1 2':
		case '2 1':
			return 5;
		case '1 3':
		case '3 1':
			return 30;
		case '1 4':
		case '4 1':
			return 25;
		case '1 5':
		case '5 1':
			return 30;
		case '2 3':
		case '3 2':
			return 20;
		case '2 4':
		case '4 2':
			return 20;
		case '2 5':
		case '5 2':
			return 25;
		case '3 4':
		case '4 3':
			return 10;
		case '3 5':
		case '5 3':
			return 10;
		case '4 5':
		case '5 4':
			return 10;
	}
}

function checkIfRepeats(event){
    var rules = event["RRULE"].split(";");
    for (var i = 0; i < rules.length; i++) {
    	if(rules[i].substring(0,6) == "BYDAY="){
    		var repeatsText = rules[i].substring(6,rules[i].length);
            var repeatsArray = repeatsText.split(",");
            //if the event does repeat, make a copy of the event and change the relevant date entries
            if (repeatsArray.length > 1){
            	for (var i = 1; i < repeatsArray.length; i++) {
            		var day;
            		switch (repeatsArray[i]){
            			case "SU":
            				day = 0;
            				break;
            			case "MO":
            				day = 1;
            				break;
            			case "TU":
            				day = 2;
            				break;
            			case "WE":
            				day = 3;
            				break;
            			case "TH":
            				day = 4;
            				break;
            			case "FR":
            				day = 5;
            				break;
            			case "SA":
            				day = 6;
            				break;
            		}
                    var eventCopy = {};
                    for (var prop in event){
                        eventCopy[prop] = event[prop];
                    }
		            var dateStart = new Date(event["DTSTART"]);
            		var currentDay = dateStart.getDay();
					var distance = day - currentDay;
					dateStart.setDate(dateStart.getDate() + distance);
                    eventCopy["DTSTART"] = dateStart;
                    
					var dateEnd = new Date(eventCopy["DTEND"]);
            		var currentDay = dateEnd.getDay();
					var distance = day - currentDay;
					dateEnd.setDate(dateEnd.getDate() + distance);
                    eventCopy["DTEND"] = dateEnd;
                    
	            	events.push(eventCopy);
            	};
        	}
    	}
    };
}

function compareEvent(startTime) {
    return function(a, b) {
        return a[startTime] - b[startTime];
    };
}

document.getElementById('files').addEventListener('change', handleFileSelect, false);