$(document).ready(function () {
    "use strict";
    var keyword = '';
    var totalTweet = document.getElementById("totalTweet");
    var socket = io.connect("http://localhost:3000");

    Highcharts.setOptions({
        global: {
            useUTC: false
        }
    });

    var donut = new Highcharts.Chart({
        chart: {
            renderTo: 'semiDonut',
            plotBackgroundColor: null,
            plotBorderWidth: null,
            plotShadow: false
        },
        title: {
            text: 'Sentiment',
        },
        tooltip: {
            formatter: function() {
                return '<b>'+ this.point.name +'</b>: '+ this.percentage.toFixed(1) +' %';
            }
        },
        plotOptions: {
            pie: {
                allowPointSelect: false,
                cursor: 'pointer',
                dataLabels: {
                    enabled: true,
                    color: '#000000',
                    connectorColor: '#000000',
                    formatter: function() {
                        return '<b>'+ this.point.name +'</b>: '+ this.percentage.toFixed(1) +' %';
                    }
                }
            }
        },
        series: [{
            type: 'pie',
            name: 'Distribution',
            data: [
                ['Neutral', 4], 
                ['Positive', 3],
                ['Negative', 3]             
            ]
        }]
    });

    var lineChart = new Highcharts.Chart({
        chart: {
            renderTo: 'lineChart',
            defaultSeriesType: 'spline'
        },
        title: {
            text: 'REAL TIME SENTIMENT SCORE'
        },
        xAxis: {
            type: 'datetime',
            tickPixelInterval: 150,
            maxZoom: 20 * 1000
        },
        yAxis: {
            minPadding: 0.2,
            maxPadding: 0.2,
            title: {
                text: 'SENTIMENT SCORE',
                margin: 80
            }
        },
        series: [{
            name: 'Sentiment Score',
            data: []
        }]
    }); 

    socket.on("state", function(inUse){
        keyword = inUse.keyword;
        $('#status').html('<h3 class="text-warning"> Monitoring "'+ keyword +'"... </h3>');
        if(inUse.state){
            $('#stop').show();
            $('#search').hide(); 
        }else{
            $('#stop').hide();
            $('#search').show();
        }
    });       

    $("#searchForm").on("submit", function(evt) {
        evt.preventDefault();
        var topic = $('#topic').val();
        keyword = topic;
        socket.emit("topic", topic);
        $('#status').html('<h3 class="text-warning"> Monitoring "'+ keyword +'"... </h3>');
        $('#stop').show();
        $('#search').hide();
    });

    $("#stopForm").on("submit", function(evt) {
        evt.preventDefault();
        socket.emit("stopStreaming", "dummy");
        $('#stop').hide();
        $('#search').show();
    });

    

    socket.on("data", function(data) {
        //console.log(data);
        donut.series[0].setData([
            ['Neutral',data.neu],   
            ['Positive',data.pos],
            ['Negative', data.neg]           
        ]);
        var series = lineChart.series[0];
        var shift = data.total > 200;
        var x = (new Date).getTime(); // current time
        var y = data.currentScore;
        $("#tweet").html(data.tweet);
        //console.log(data.total);
        //totalTweet.value = data.total;
        $("#totalTweet").html(data.total);
        $("#positiveTweet").html(data.pos);
        $("#negativeTweet").html(data.neg);
        $("#neutralTweet").html(data.neu);
        var sentimentScore = (data.pos - data.neg) / (data.pos + data.neg)
        $("#sentimentScore").html(parseFloat(sentimentScore).toFixed(2));

        //lineChart.series[0].addPoint( [x,y], true, shift); 
        lineChart.series[0].addPoint( [x,y],true, shift);
    });

    socket.on("list", function(tweets) {
        console.log(tweets);
        var title = "<h4 class='text-center'>LAST 10 SENTIMENT ANALYSIS</h4>";
        var table = title + "<table class='table table-condensed table-bordered'>";
        table = table + "<tr><td><b>Keyword</b></td><td><b>Total Tweets</b></td><td><b>Sentiment Score</b></td></tr>";
        for (var i = tweets.length-1; i >=  0; i--) {
            table = table + "<tr><td>" + tweets[i].keyword + "</td>";
            table = table + "<td>" + tweets[i].total + "</td>";
            table = table + "<td>" + tweets[i].score.toFixed(2) + "</td></tr>";
        }

        $("#recentSearch").html(table);
    });

});

