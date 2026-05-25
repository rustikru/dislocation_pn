$(document).ready(function() {
    build_report_1_ajax();
    build_report_2_ajax();
	build_report_3_ajax();
});

function build_report_1_ajax(){
    start_loading_animation();
    
    function build_report_1(p_data){
        var records = JSON.parse(p_data);
        $('table.report_1_table tbody').empty();

        var table = $('table.report_1_table');

        for(var i=0; i<records.length; i++) {
            var child = records[i];
            var tr = $('<tr/>');
            tr.append('<td>'+child.CAR_NUMBER+'</td>');
            tr.append('<td>'+((child.STATION !== null) ? child.STATION : '')+'</td>'); 
            tr.append('<td>'+((child.LOCATION !== null) ? child.LOCATION : '')+'</td>'); 
            tr.append('<td>'+((child.RAILWAY !== null) ? child.RAILWAY : '')+'</td>'); 
            tr.append('<td>'+((child.STATUS !== null) ? child.STATUS : '')+'</td>'); 
            tr.append('<td>'+((child.STATE !== null) ? child.STATE : '')+'</td>'); 
            tr.append('<td>'+((child.FREIGHT_NAME !== null) ? child.FREIGHT_NAME : '')+'</td>'); 
            tr.append('<td>'+((child.OWNER !== null) ? child.OWNER : '')+'</td>');
            tr.append('<td>'+((child.DATE_ARRIVE !== null) ? child.DATE_ARRIVE : '')+'</td>'); 
            tr.append('<td>'+((child.DATE_ACCEPT !== null) ? child.DATE_ACCEPT : '')+'</td>'); 
            tr.appendTo(table);
        }
        stop_loading_animation();
    }
    
    $.ajax({
        url: 'reports_data.php',
        type: 'POST',
        dataType: "text",
        async:false,
        data: { ajax_action: 'get_report_1_data'
              },
        success: function (data) {build_report_1(data);},
        error: function (m1,m2) {window.alert(m1+m2);}
    });
}

function build_report_2_ajax(){
    start_loading_animation();
    
    function build_report_2(p_data){
        var records = JSON.parse(p_data);
        $('table.report_2_table tbody').empty();

        var table = $('table.report_2_table');

        for(var i=0; i<records.length; i++) {
            var child = records[i];
            var tr = $('<tr/>');
            tr.append('<td class="'+((child.ERR_TYPE == 'Нет увода') ? 'td_err_uvod' : 'td_err_post')+'">'+child.ERR_TYPE+'</td>');
            tr.append('<td>'+child.CAR_NUMBER+'</td>');
            tr.append('<td>'+((child.STATION !== null) ? child.STATION : '')+'</td>'); 
            tr.append('<td>'+((child.LOCATION !== null) ? child.LOCATION : '')+'</td>'); 
            tr.append('<td>'+((child.RAILWAY !== null) ? child.RAILWAY : '')+'</td>'); 
            tr.append('<td>'+((child.STATUS !== null) ? child.STATUS : '')+'</td>'); 
            tr.append('<td>'+((child.STATE !== null) ? child.STATE : '')+'</td>'); 
            tr.append('<td>'+((child.FREIGHT_NAME !== null) ? child.FREIGHT_NAME : '')+'</td>'); 
            tr.append('<td>'+((child.DATE_OPER !== null) ? child.DATE_OPER : '')+'</td>');
            tr.append('<td>'+((child.DOWNTIME !== null) ? child.DOWNTIME : '')+'</td>');
            tr.appendTo(table);
        }
        stop_loading_animation();
    }
    
    $.ajax({
        url: 'reports_data.php',
        type: 'POST',
        dataType: "text",
        async:false,
        data: { ajax_action: 'get_report_2_data'
              },
        success: function (data) {build_report_2(data);},
        error: function (m1,m2) {window.alert(m1+m2);}
    });
}

function build_report_3_ajax(){
    start_loading_animation();
    
    function build_report_1(p_data){
        var records = JSON.parse(p_data);
        $('table.report_3_table tbody').empty();

        var table = $('table.report_3_table');

        for(var i=0; i<records.length; i++) {
            var child = records[i];
            var tr = $('<tr/>');
            tr.append('<td>'+child.CAR_NUMBER+'</td>');
            tr.append('<td>'+((child.STATION !== null) ? child.STATION : '')+'</td>'); 
            tr.append('<td>'+((child.LOCATION !== null) ? child.LOCATION : '')+'</td>'); 
            tr.append('<td>'+((child.RAILWAY !== null) ? child.RAILWAY : '')+'</td>'); 
            tr.append('<td>'+((child.STATUS !== null) ? child.STATUS : '')+'</td>'); 
            tr.append('<td>'+((child.STATE !== null) ? child.STATE : '')+'</td>'); 
            tr.append('<td>'+((child.FREIGHT_NAME !== null) ? child.FREIGHT_NAME : '')+'</td>'); 
            tr.append('<td>'+((child.OWNER !== null) ? child.OWNER : '')+'</td>');
            tr.append('<td>'+((child.DATE_ARRIVE !== null) ? child.DATE_ARRIVE : '')+'</td>'); 
            tr.append('<td>'+((child.DATE_ACCEPT !== null) ? child.DATE_ACCEPT : '')+'</td>'); 
            tr.appendTo(table);
        }
        stop_loading_animation();
    }
    
    $.ajax({
        url: 'reports_data.php',
        type: 'POST',
        dataType: "text",
        async:false,
        data: { ajax_action: 'get_report_3_data'
              },
        success: function (data) {build_report_1(data);},
        error: function (m1,m2) {window.alert(m1+m2);}
    });
}
