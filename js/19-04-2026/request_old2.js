var l_request_this;/*для вызова из других частей программы*/

$(document).ready(function() {
    var l_this = this;
    l_request_this = l_this; 
    
    $.ajax({
        url: 'data.php',
        type: 'POST',
        dataType: "text",
        async:false,
        data: { ajax_action: 'getLoginData'
              },
        success: function (data) {
            var result = JSON.parse(data);
            l_this.r_create_request = (result.create_request==='Y');
            l_this.r_change_request = (result.change_request==='Y');
            l_this.r_view_request = (result.view_request==='Y');
        },
        error: function (m1,m2) {window.alert(m1+m2);}
    });
    
    if (!l_this.r_create_request&&!l_this.r_change_request&&!l_this.r_view_request){
        return;
    }

    $.ajax({
        url: 'data.php',
        type: 'POST',
        dataType: "text",
        data:   {station_id: 3 
                ,ajax_action: 'get_railways_for_request'
                },
        success: function (data) {
                l_this.railways_for_request = JSON.parse(data);
            }
    });
    
    $.ajax({
        url: 'data.php',
        type: 'POST',
        dataType: "text",
        data:   {station_id: 3 
                ,ajax_action: 'get_tasks_for_request'
                },
        success: function (data) {
                l_this.tasks_for_request = JSON.parse(data);
            }
    });
    
    this.request_window = $('<div>')
        .addClass('request-window')
        .appendTo($('div.wrapper'));

    this.request_titlebar = $('<div>')
        .addClass('request-titlebar helper-clearfix')
        .appendTo(this.request_window);

    $('<span>')
        .text('Заявки')
        .addClass('request-title')
        .appendTo(this.request_titlebar);

    this.request_titlebar_add_button = $('<button>')
        .addClass('request-button request-titlebar-add-button')
        .attr('title','Добавить заявку')
        .append('<span class="request-button-icon request-titlebar-add-icon"></span>')
        .click(function(){
            create_request_window(l_this,null,null,null);
        })
        .appendTo(this.request_titlebar);
    if (!this.r_create_request) {
        this.request_titlebar_add_button.hide();
    }   
        
        
    this.request_titlebar_turn_button = $('<button>')
        .addClass('request-button request-titlebar-turn-button')
        .attr('title','Скрыть список заявок')
        .append('<span class="request-button-icon request-titlebar-turn-icon"></span>')
        .click(function(){
            toggle_request_content(l_this);
        })
        .appendTo(this.request_titlebar);

    this.request_content = $('<div>')
        .addClass('request-content')
        .appendTo(this.request_window);
    this.request_content_mas = [];   
    
    this.add_request_to_content = function (p_request_id,p_created_by_id,p_title){
        var l_request_item = $('<div>')
            .addClass('request-item')
            .prependTo(this.request_content);
        l_request_item.pos = this.request_content_mas.length;
        
        l_request_item.request_id = p_request_id;
        l_request_item.created_by_id = p_created_by_id;
        
        $('<span>')
            .addClass('request-item-title')
            .text(p_title)
            .appendTo(l_request_item);
    
        l_request_item.view_btn = $('<button>')
            .addClass('request-button request-item-view-btn')
            .attr('title','Открыть заявку')
            .append('<span class="request-button-icon request-item-view-btn-icon"></span>')
            .click(function(){
                create_request_window(l_this,l_request_item.request_id,l_request_item.created_by_id,p_title);
            })
            .appendTo(l_request_item);
    
        l_request_item.set_flag_need_close = function(){
            if (!l_request_item.hasClass('request-item-need-close')){
                l_request_item.addClass('request-item-need-close');
            }
        };

        this.request_content_mas[l_request_item.pos] = l_request_item;
        
        return l_request_item;
    };
    
    this.refresh_requests = function(){
        $.ajax({
            url: 'data.php',
            type: 'POST',
            dataType: "text",
            data: { ajax_action: 'get_requests'
                  },
            success: function (data) {
                var l_requests = JSON.parse(data);
                l_requests.forEach(function (item){
                    var l_exists_item = false;
                    l_this.request_content_mas.forEach(function(request){
                        if (item.REQUEST_ID == request.request_id){
                            l_exists_item=true;
                            
                            if (item.CARS_COUNT == item.DONE_CARS_COUNT && item.CARS_COUNT!='0') {
                                request.set_flag_need_close();
                            }
                        }
                    });
                    if (!l_exists_item) {
                        var l_title = '№'+item.REQUEST_ID+' от '+item.CREATED_DATE
                        if (l_this.r_view_request){
                            l_title+=' ('+(item.DIVISION==null?'':item.DIVISION+' ')+item.TASK_DESCR+')';
                        }else{
                            l_title+=' ('+item.CREATED_BY+' '+item.TASK_DESCR+')';
                        }
                        
                        var l_cur_request = l_this.add_request_to_content(item.REQUEST_ID,item.CREATED_BY_ID,l_title);
                        
                        if (item.CARS_COUNT == item.DONE_CARS_COUNT && item.CARS_COUNT!='0') {
                            l_cur_request.set_flag_need_close();
                        }
                    }
                });
                
                l_this.request_content_mas.forEach(function(request){
                    var l_exists_item = false;
                    l_requests.forEach(function (item){
                        if (item.REQUEST_ID == request.request_id){
                            l_exists_item=true;
                        }
                    });
                    if (!l_exists_item) {
                        request.remove();
                        delete l_this.request_content_mas[request.pos];
                    }
                });
            },
            error: function (m1,m2) {window.alert(m1+m2);}
        }); 
    };
    
    l_this.refresh_requests();
    setInterval(function() {
        l_this.refresh_requests();
    }, 1000*5*60);

});

function toggle_request_content(p_document){
    if (p_document.request_content.is(":visible")){
        p_document.request_content.hide();
    } else {
        p_document.request_content.show();
    }
}

/*p_task - задача; заполняется когда форма заявки вызывается из формы погрзуки/разгрузки*/
/*p_cars_req_win - массив вагонов; заполняется когда форма заявки вызывается из формы погрузки/разгрузки*/
function create_request_window(p_document,p_request_id,p_created_by_id,p_title,p_task,p_cars_req_win){
    function save_request_ajax(){
        var l_criterias = '';
        md_content.list_of_criteria_mas.forEach(function(item){
            l_criterias+=(item.railway.val()==''?'_':item.railway.val())+'|'+
                         (item.freight.val()==''?'_':item.freight.val())+'|'+
                         (item.status.val()==''?'_':item.status.val())+'|'+
                         (item.state.val()==''?'_':item.state.val())+'|'+
                         (item.cars_count.val()==''?'_':item.cars_count.val())+'$';
        });
        
        var l_cars = '';
        md_content.list_of_cars_mas.forEach(function(item){
            var tmp_cars = '';
            item.list_of_cars.children().each(function(){
                tmp_cars+=$(this).text()+':'; 
            });
            l_cars+=(item.railway.val()==''?'_':item.railway.val())+'|'+tmp_cars+'$';
        });
        
        var res = null;
        $.ajax({
            url: 'data.php',
            type: 'POST',
            dataType: "text",
            async:false,
            data: { request_id: md_content.request_id
                   ,deadline_date: md_content.deadline_date_input.val()
                   ,task: md_content.task_select.val()
                   ,creterias: l_criterias
                   ,cars: l_cars
                   ,ajax_action: 'save_request'},
            success: function (data) {
                res = data;
            },
            error: function (m1,m2) {window.alert(m1+m2);}
        });
        return res;
    }
    function disable_save_btn(){
        if (md_content.deadline_date_input.hasClass('red_bckg_color')||md_content.deadline_date_input.val()==''){
            $('#md_save_request_btn').prop( "disabled", true );
        }else{
            $('#md_save_request_btn').prop( "disabled", false );
        }    
    }
    var md_content = $('<div/>')
        .addClass('md-lvl-1')
        .appendTo('body');
    
    var l_criterias_mas = [];
    var l_title;
    
    if (p_request_id == null){    
        /*$.ajax({
            url: 'data.php',
            type: 'POST',
            dataType: "text",
            async:false,
            data: { ajax_action: 'get_new_request_id'},
            success: function (data) {
                md_content.request_id = data;
            },
            error: function (m1,m2) {window.alert(m1+m2);}
        });*/
        md_content.request_id = null;
        l_title = 'Заявка';
        md_content.task_id = p_task;
    } else{
        md_content.request_id = p_request_id;
        $.ajax({
            url: 'data.php',
            type: 'POST',
            dataType: "text",
            async:false,
            data: { request_id: md_content.request_id
                   ,ajax_action: 'get_request'},
            success: function (data) {
                var l_request = JSON.parse(data);
                md_content.deadline_date = l_request[0].DEADLINE_DATE;
                md_content.task_id = l_request[0].TASK_ID;
                md_content.done_cars_count = l_request[0].DONE_CARS_COUNT;
                md_content.created_by = l_request[0].CREATED_BY;
            },
            error: function (m1,m2) {window.alert(m1+m2);}
        });
        md_content.request_id = p_request_id;
        $.ajax({
            url: 'data.php',
            type: 'POST',
            dataType: "text",
            async:false,
            data: { request_id: md_content.request_id
                   ,ajax_action: 'get_request_criterias'},
            success: function (data) {
                l_criterias_mas = data.split('$');
                l_criterias_mas.pop();
            },
            error: function (m1,m2) {window.alert(m1+m2);}
        });
        l_title = p_title;
    }
        
    md_content.attr('title',l_title);
    
    /*объявлеям элементы интерфейса для атрибутов заявки*/
    md_content.deadline_date_in_input = $('<input>',{class:'text ui-widget-content ui-corner-all required',css:{'width':'9em'}});  // срок выполнения с
    md_content.deadline_date_out_input = $('<input>',{class:'text ui-widget-content ui-corner-all required',css:{'width':'9em'}}); // срок выполнения с 
    md_content.task_select = $('<select>',{class:'request-window-attr-item-elem'}); // задача
    md_content.task_select.append($('<option>',{'val':'','text':''}));
    p_document.tasks_for_request.forEach(function(item){
         md_content.task_select.append($('<option>',{'val':item.ID,'text':item.NAME}));
    });
    md_content.done_cars_count_input = $('<input>',{class:'request-window-attr-item-elem text ui-widget-content ui-corner-all',css:{'width':'5em'}});// кол-во выполн. вагонов
    md_content.done_cars_count_input.prop('disabled', true);
    md_content.created_by_input = $('<input>',{class:'request-window-attr-item-elem text ui-widget-content ui-corner-all',css:{'width':'12em'}});// кто создал заявку
    md_content.created_by_input.prop('disabled', true);
    
    /*инициализация элементов интерфейса атрибутов заявки*/
    init_date_time_input(md_content.deadline_date_in_input);
    init_date_time_input(md_content.deadline_date_out_input);
    md_content.deadline_date_in_input.val(md_content.deadline_date);
    md_content.deadline_date_out_input.val(md_content.deadline_date);
    md_content.task_select.val(md_content.task_id);
    md_content.done_cars_count_input.val(md_content.done_cars_count);
    if (p_request_id == null) {
        md_content.created_by_input.val(user_name); /*глобальная перенная из context_menu.js*/
    } else {
        md_content.created_by_input.val(md_content.created_by);
    }
    
    /*обработка обязательных полей на изменение*/
    md_content.deadline_date_in_input.blur(function(){
        disable_save_btn();
    });
    md_content.deadline_date_out_input.blur(function(){
        disable_save_btn();
    });
    
    /*строим шапку с атрибутами заявки*/
    var l_div_deadline = $('<div>')
        .addClass('request-window-attr-item helper-clearfix')
        .append($('<label>',{text:'Срок выполнения (местное) c',class:'request-window-attr-item-text'}))
        .append(md_content.deadline_date_in_input)
        .append($('<label>',{text:'по',class:'request-window-attr-item-text request-window-attr-item-text-between'}))
        .append(md_content.deadline_date_out_input);
    
    var l_div_task = $('<div>')
        .addClass('request-window-attr-item helper-clearfix')
        .append($('<label>',{text:'Задача',class:'request-window-attr-item-text request-window-attr-item-text-left'}))
        .append(md_content.task_select);
    var l_div_done_cars_count = $('<div>')
        .addClass('request-window-attr-item helper-clearfix')
        .append($('<label>',{text:'Кол-во выполненных вагонов',class:'request-window-attr-item-text request-window-attr-item-text-left'}))
        .append(md_content.done_cars_count_input);
    var l_div_created_by = $('<div>')
            .addClass('request-window-attr-item helper-clearfix')
            .append($('<label>',{text:'Создал',class:'request-window-attr-item-text request-window-attr-item-text-left'}))
            .append(md_content.created_by_input); 
    $('<div>')
        .addClass('request-window-attr')
        .append(l_div_deadline)
        .append(l_div_task)
        .append(l_div_done_cars_count)
        .append(l_div_created_by)
        .appendTo(md_content);
    
    /************  Крититерии заявки  ****************/
    md_content.list_of_criteria = $('<div>')
        .addClass('list-criteria ')
        .appendTo(md_content);
    md_content.list_of_criteria_mas = [];
    md_content.criteria_header = $('<div>')
        .addClass('criteria-header')
        .text('Критерии')
        .css({'width':'100px'})
        .appendTo(md_content.list_of_criteria);
    md_content.criteria_add_button = $('<button>')
        .addClass('request-button criteria-add-button')
        .attr('title','Добавить критерий')
        .append('<span class="request-button-icon request-titlebar-add-icon"></span>')
        .appendTo(md_content.criteria_header);
    
    md_content.criteria_add_button.click(function(e,p_criteria){
        var l_criteria_item = $('<div>')
            .addClass('criteria-item criteria-item-width')
            .appendTo(md_content.list_of_criteria);
        ;
        
        l_criteria_item.pos = md_content.list_of_criteria_mas.length;
        
        md_content.list_of_criteria_mas[l_criteria_item.pos] = l_criteria_item; //push(l_criteria_item);
        
        /***************** Путь *****************/
        var div5 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Путь','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.railway = $('<select>')
            .css({'width':'15em'})
            .appendTo(div5);
        l_criteria_item.railway.append($('<option>'));
        $.each(p_document.railways_for_request, function( i, item ) {
            l_criteria_item.railway.append($('<option>',{'val':item.ID,'text':item.NAME,'disabled':item.DISABLED=='Y'?true:false}).css({'margin-left':((item.LVL-1)*10 + 'px')}));
            /*result += '<option '+((item.DISABLED=='Y')?'disabled':'')+' style="'+('margin-left: '+(item.LVL-1)*10 + 'px')+'" data-id="'+item.ID
                     +'" data-type="'+item.TYPE+'" value="'+item.ID+'" data-cars_count="'+item.COUNT_RAILCARS+'" data-free_length="'+item.FREE_LENGTH+'">'+item.NAME+'</option>';*/
        });
        /***************** Путь *****************/
        
        /***************** Техн. точка *****************/
        var div6 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Техн. точка','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.point = $('<select>')
            .css({'width':'15em'})
            .appendTo(div6);
        l_criteria_item.point.append($('<option>'));
        /***************** Техн. точка *****************/
        
        /***************** Тип *****************/
        var div7 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Тип','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.type = $('<select>')
            .appendTo(div7);
        l_criteria_item.type.append($('<option>'));
        $.each(g_car_type_list, function( i, item ) {
            l_criteria_item.type.append($('<option>',{'val':item.CAR_TYPE,'text':item.CAR_TYPE}));
        });
        /***************** Тип *****************/
        
        /***************** Статус *****************/
        var div2 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Статус','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.status = $('<select>')
            .appendTo(div2);
        $.each(g_inspection_results, function( i, item ) {
            l_criteria_item.status.append($('<option>',{'val':item.CODE,'text':item.CODE}));
        });
        /***************** Статус *****************/
        
        /***************** Состояние *****************/
        var div3 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Состояние','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.state = $('<select>')
            .appendTo(div3);
        l_criteria_item.state.append($('<option>'));
        l_criteria_item.state.append($('<option>',{'val':'пор.','text':'пор.'}));
        l_criteria_item.state.append($('<option>',{'val':'гр.','text':'гр.'}));
        /***************** Состояние *****************/
        
        /***************** Груз *****************/
        var div1 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Груз','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.freight = $('<select>',{'class':'criteria-item-freight'})
            .appendTo(div1);
        l_criteria_item.freight.append($('<option>'));
        $.each(g_freight_list, function( i, item ) {
            l_criteria_item.freight.append($('<option>',{'val':item.FREIGHT_NAME,'text':item.FREIGHT_NAME}));
        });
        /***************** Груз *****************/
        
        /***************** Кол-во *****************/
        var div4 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Кол-во','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.cars_count = $('<input>',{'class':'criteria-item-cars-count','maxlength':'3'})
            .appendTo(div4);
        l_criteria_item.cars_count.keypress(function (e){
            // Разрешаем: backspace, delete, влево, вправо
            if (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 37 || e.keyCode === 39) {
                return;
            }

            var chr = String.fromCharCode(e.charCode);

            if (chr == null) return;

            if (chr < '0' || chr > '9') {
                return false;
            }
        }); 
        /***************** Кол-во *****************/
        
        /***************** Примечание *****************/
        var div8 = $('<div>')
            .addClass('criteria-item-div')
            .append($('<span>',{'text':'Примечание','class':'criteria-item-span'}))
            .appendTo(l_criteria_item);
        l_criteria_item.cars_count = $('<input>',{'class':'criteria-item-descr','maxlength':'250'})
            .appendTo(div8);
        /***************** Примечание *****************/
        
        /***************** Кнопка удалить *****************/
        /*l_criteria_item.remove_btn = $('<button>',{'text':'Удалить'})
            .appendTo(l_criteria_item);*/
    
        l_criteria_item.remove_btn = $('<button>')
            .addClass('request-button criteria-item-delete-button')
            .attr('title','Удалить критерий')
            .append('<span class="request-button-icon delete-button-icon"></span>')
            .appendTo(l_criteria_item);
            
        l_criteria_item.remove_btn.click(function(){
            l_criteria_item.remove();
            
            delete md_content.list_of_criteria_mas[l_criteria_item.pos];
            //l_criteria_item.addClass('criteria-item-removed');
        });
        /***************** Кнопка удалить *****************/
        
        /*инициализация атрибутов*/
        if (p_criteria != null){
            var l_criteria_mas  = p_criteria.split('|');
            l_criteria_item.railway.val(l_criteria_mas[0]);
            l_criteria_item.freight.val(l_criteria_mas[1]);
            l_criteria_item.status .val(l_criteria_mas[2]);
            l_criteria_item.state.val(l_criteria_mas[3]);
            l_criteria_item.cars_count.val(l_criteria_mas[4]);
        }
        
        l_criteria_item.railway.combobox({menuMaxHeight: '25em'});
        
        /*******    Вагоны по критерию    ********/
        l_criteria_item.list_of_cars_item_mas = [];
        
        l_criteria_item.list_of_cars = $('<div>')
            .addClass('list-cars')
            .appendTo(l_criteria_item);
        l_criteria_item.cars_header = $('<div>')
            .addClass('criteria-header')
            .text('Вагоны')
            .css({'width':'87px'})
            .appendTo(l_criteria_item.list_of_cars);
        l_criteria_item.cars_add_button = $('<button>')
            .addClass('request-button criteria-add-button')
            .attr('title','Добавить вагоны')
            .append('<span class="request-button-icon request-titlebar-add-icon"></span>')
            .appendTo(l_criteria_item.cars_header);
    
        l_criteria_item.cars_add_button.click(function(e,p_cars){
            var l_cars_item = $('<div>')
                .addClass('criteria-item cars-item-width helper-clearfix')
                .appendTo(l_criteria_item.list_of_cars);
            
            l_cars_item.pos = l_criteria_item.list_of_cars_item_mas.length;
            l_criteria_item.list_of_cars_item_mas[l_cars_item.pos] = l_cars_item;
            
            l_cars_item.add_car =  function (p_car_number){
                function get_info(p_car_number,p_info_type){
                    var res;
                    $.ajax({
                        url: 'data.php',
                        type: 'POST',
                        dataType: "text",
                        async:false,
                        data: { car_number: p_car_number
                               ,info_type: p_info_type
                               ,ajax_action: 'get_info_for_car_request'
                              },
                        success: function (data) {
                            res = data;
                        },
                        error: function (m1,m2) {window.alert(m1+m2);}
                    });
                    
                    return res;
                };
                
                var l_owner = get_info(p_car_number,1);
                var l_station = get_info(p_car_number,2);
                var l_railway = get_info(p_car_number,3);

                var l_div = $('<div>',{'class':'cars-item-car-div'}).appendTo(l_cars_item.list_of_cars);
                $('<input>',{'class':'cars-item-car-input text ui-widget-content ui-corner-all','disabled':true}).val(p_car_number).appendTo(l_div);
                $('<input>',{'class':'cars-item-owner-input text ui-widget-content ui-corner-all','disabled':true}).val(l_owner).appendTo(l_div);
                $('<input>',{'class':'cars-item-station-input text ui-widget-content ui-corner-all','disabled':true}).val(l_station).appendTo(l_div);
                $('<input>',{'class':'cars-item-railway-input text ui-widget-content ui-corner-all','disabled':true}).val(l_railway).appendTo(l_div);       
                $('<button>')
                    .addClass('request-button cars-item-car-span-delete-button')
                    .attr('title','Удалить вагон')
                    .append('<span class="request-button-icon delete-button-icon"></span>')
                    .appendTo(l_div)
                    .click(function(){l_div.remove();});
            };
            
            /***************** Путь *****************/
            var div1 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Путь','class':'criteria-item-span','style':'padding: 2px 0px 5px;'}))
                .appendTo(l_cars_item);
            l_cars_item.railway = $('<select>')
                .css({'width':'15em'})
                .appendTo(div1);
            l_cars_item.railway.append($('<option>'));
            $.each(p_document.railways_for_request, function( i, item ) {
                l_cars_item.railway.append($('<option>',{'val':item.ID,'text':item.NAME,'disabled':item.DISABLED=='Y'?true:false}).css({'margin-left':((item.LVL-1)*10 + 'px')}));
            });
            
            l_cars_item.railway.combobox({menuMaxHeight: '25em'});
            /***************** Путь *****************/
            
            /***************** Техн. точка *****************/
            var div2 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Техн. точка','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            l_cars_item.point = $('<select>')
                .css({'width':'15em'})
                .appendTo(div2);
            l_cars_item.point.append($('<option>'));
            /***************** Техн. точка *****************/

            /***************** Тип *****************/
            var div3 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Тип','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            l_cars_item.type = $('<select>')
                .appendTo(div3);
            l_cars_item.type.append($('<option>'));
            $.each(g_car_type_list, function( i, item ) {
                l_cars_item.type.append($('<option>',{'val':item.CAR_TYPE,'text':item.CAR_TYPE}));
            });
            /***************** Тип *****************/

            /***************** Статус *****************/
            var div4 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Статус','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            l_cars_item.status = $('<select>')
                .appendTo(div4);
            $.each(g_inspection_results, function( i, item ) {
                l_cars_item.status.append($('<option>',{'val':item.CODE,'text':item.CODE}));
            });
            /***************** Статус *****************/

            /***************** Состояние *****************/
            var div5 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Состояние','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            l_cars_item.state = $('<select>')
                .appendTo(div5);
            l_cars_item.state.append($('<option>'));
            l_cars_item.state.append($('<option>',{'val':'пор.','text':'пор.'}));
            l_cars_item.state.append($('<option>',{'val':'гр.','text':'гр.'}));
            /***************** Состояние *****************/
            
            /***************** Задача *****************/
            var div6 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Задача','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            l_cars_item.task = $('<select>',{class:'cars-item-task'})
                .appendTo(div6);
            l_cars_item.task.append($('<option>'));
            /***************** Задача *****************/
            
            /***************** Время *****************/
            var div7 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Время','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            //$('<span>',{'text':'с',css:{'margin-right':'5px'}}).appendTo(div7);
            //l_cars_item.date_in = $('<input>',{class:'text ui-widget-content ui-corner-all',css:{'width':'9em'}})
            //    .appendTo(div7);
            //$('<span>',{'text':'по',css:{'margin':'5px'}}).appendTo(div7);
            l_cars_item.date_out = $('<input>',{class:'text ui-widget-content ui-corner-all',css:{'width':'9em'}})
                .appendTo(div7);
            //init_date_time_input(l_cars_item.date_in);
            init_date_time_input(l_cars_item.date_out);
            /***************** Время *****************/
            
            /***************** Примечание *****************/
            var div8 = $('<div>')
                .addClass('cars-item-div')
                .append($('<span>',{'text':'Примечание','class':'criteria-item-span'}))
                .appendTo(l_cars_item);
            l_cars_item.descr = $('<input>',{'class':'cars-item-descr','maxlength':'250'})
                .appendTo(div8);
            /***************** Примечание *****************/
            
            /***************** Список вагонов *****************/
            var div9 = $('<div>')
                .addClass('cars-item-div-list')
                .appendTo(l_cars_item);
            var div9_1 = $('<div>')
                .appendTo(div9);
            $('<span>',{'text':'Номера вагонов',css:{'margin-right':'0.5em'}}).appendTo(div9_1);
            var l_car_number = $('<input>',{'maxlength':'8','class':'cars-item-input ui-widget-content ui-corner-all'})
                .appendTo(div9_1);
            l_car_number.keypress(function (e){
                // Разрешаем: backspace, delete, влево, вправо
                if (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 37 || e.keyCode === 39) {
                    return;
                }

                var chr = String.fromCharCode(e.charCode);

                if (chr == null) return;

                if (chr < '0' || chr > '9') {
                    return false;
                }
            }); 
            l_car_number.keyup(function (e){        
                if (check_car_number($(this).val())){                
                    $(this).addClass('true-car-number');
                } else{
                    $(this).removeClass('true-car-number'); 
                }
            });
            var l_add_car_btn = $('<button>',{'class':'request-button cars-item-add-btn'})
                .append('<span class="">Добавить</span>')
                .appendTo(div9_1);
            l_cars_item.list_of_cars = $('<div>',{'class':'cars-item-list-of-cars helper-clearfix'})
                .appendTo(div9);
        
            l_cars_item.list_of_cars_mas = [];
            
            l_add_car_btn.click(function(){
                //var l_car_item = $('<div>')
                //    .addClass('criteria-item cars-item-width helper-clearfix')
                //    .appendTo(l_criteria_item.list_of_cars);

                //l_cars_item.pos = l_criteria_item.list_of_cars_mas.length;
                //l_criteria_item.list_of_cars_mas[l_cars_item.pos] = l_cars_item;
                
                if (l_car_number.hasClass('true-car-number')) {
                    //l_cars_item.add_car(l_car_number.val());
                    
                    function get_info(p_car_number,p_info_type){
                        var res;
                        $.ajax({
                            url: 'data.php',
                            type: 'POST',
                            dataType: "text",
                            async:false,
                            data: { car_number: p_car_number
                                   ,info_type: p_info_type
                                   ,ajax_action: 'get_info_for_car_request'
                                  },
                            success: function (data) {
                                res = data;
                            },
                            error: function (m1,m2) {window.alert(m1+m2);}
                        });

                        return res;
                    };
                    
                    var l_car = l_car_number.val();
                    
                    var l_owner = get_info(l_car,1);
                    var l_station = get_info(l_car,2);
                    var l_railway = get_info(l_car,3);
                    
                    var l_car_descr = $('<div>',{'class':'cars-item-car-div'}).appendTo(l_cars_item.list_of_cars);
                    l_car_descr.pos = l_cars_item.list_of_cars_mas.length;
                    l_cars_item.list_of_cars_mas[l_car_descr.pos] = l_car_descr;
                    
                    l_car_descr.car_number = $('<input>',{'class':'cars-item-car-input text ui-widget-content ui-corner-all','disabled':true}).val(l_car).appendTo(l_car_descr);
                    l_car_descr.car_owner = $('<input>',{'class':'cars-item-owner-input text ui-widget-content ui-corner-all','disabled':true}).val(l_owner).appendTo(l_car_descr);
                    l_car_descr.car_station = $('<input>',{'class':'cars-item-station-input text ui-widget-content ui-corner-all','disabled':true}).val(l_station).appendTo(l_car_descr);
                    l_car_descr.car_railway = $('<input>',{'class':'cars-item-railway-input text ui-widget-content ui-corner-all','disabled':true}).val(l_railway).appendTo(l_car_descr);       
                    l_car_descr.remove_btn = $('<button>')
                        .addClass('request-button cars-item-car-span-delete-button')
                        .attr('title','Удалить вагон')
                        .append('<span class="request-button-icon delete-button-icon"></span>')
                        .appendTo(l_car_descr)
                        .click(function(){
                            l_car_descr.remove();
                            delete l_cars_item.list_of_cars_mas[l_car_descr.pos];
                        });
                }
            });
            /***************** Список вагонов *****************/
            
        /***************** Кнопка удалить *****************/    
        l_cars_item.remove_btn = $('<button>')
            .addClass('request-button criteria-item-delete-button')
            .attr('title','Удалить вагоны')
            .append('<span class="request-button-icon delete-button-icon"></span>')
            .appendTo(l_cars_item);
    
        l_cars_item.remove_btn.click(function(){
            l_cars_item.remove();
            delete l_criteria_item.list_of_cars_item_mas[l_cars_item.pos];
        });
        /***************** Кнопка удалить *****************/
            
        });
    });
    
    if (l_criterias_mas.length == 0){
        md_content.criteria_add_button.triggerHandler('click',null);
    }else{
        l_criterias_mas.forEach(function(item){
            md_content.criteria_add_button.triggerHandler('click',item);
        });  
    };

    md_content.dialog({
        resizable:false,
        modal:true,
        width: 'auto',
        position: { my: 'top', at: 'top+150' },
        buttons:{
            'Сохранить заявку':{
                text: "Сохранить",
                id: "md_save_request_btn",
                click: function(){
                    var f_res = save_request_ajax();
                    var f_res_mas = f_res.split('$');
                    if (f_res_mas[0]=='done') {
                        var l_mes = '';
                        if (p_request_id == null){
                            md_content.request_id = f_res_mas[1];
                            var l_title = '№'+md_content.request_id+' ('+user_name+')'; /*user_name - глобальная переменная из context_menu.js*/
                            p_document.add_request_to_content(md_content.request_id,user_id,l_title); /*user_id - глобальная переменная из context_menu.js*/
                            l_mes = 'Заявка №'+md_content.request_id+' создана!';
                        } else{
                            l_mes = 'Заявка №'+md_content.request_id+' обновлена!';
                        }
                        md_content.dialog("close");
                        create_info_modal_dialog_new('Оповещение',l_mes);/*функция из файла context_menu.js*/
                    }else{
                        md_content.dialog("close");
                        create_info_modal_dialog_new('Ошибка','Процедура завершилась с ошибкой!!!');
                    };
                }   
            },
            'Закрыть заявку': {
                text: "Закрыть заявку",
                id: "md_close_request_btn",
                click: function(){
                    function save_request_status_ajax(){
                        var res = null;
                        $.ajax({
                            url: 'data.php',
                            type: 'POST',
                            dataType: "text",
                            async:false,
                            data: { request_id: md_content.request_id
                                   ,status: md_lvl_2_content.status_select.val()
                                   ,status_descr: md_lvl_2_content.status_descr_input.val()
                                   ,ajax_action: 'save_request_status'},
                            success: function (data) {
                                res = data;
                            },
                            error: function (m1,m2) {window.alert(m1+m2);}
                        });
                        return res;
                    }
                    
                    var md_lvl_2_content = $('<div/>')
                        .addClass('md-lvl-2')
                        .attr('title','Закрыть заявку')
                        .appendTo('body');

                    md_lvl_2_content.status_select = $('<select>',{class:'request-window-attr-item-elem'});
                    md_lvl_2_content.status_select.append($('<option>',{'val':'D','text':'Выполнено'}));
                    md_lvl_2_content.status_select.append($('<option>',{'val':'R','text':'Выполнено с замечаниями'}));
                    md_lvl_2_content.status_select.append($('<option>',{'val':'F','text':'Не выполнено'}));
                    md_lvl_2_content.status_descr_input = $('<input>',{class:'request-window-attr-item-elem ui-widget-content ui-corner-all',css:{'width':'20em'}});
                    
                    var l_div_status = $('<div>')
                        .addClass('request-window-attr-item helper-clearfix')
                        .append($('<label>',{text:'Статус',class:'request-window-attr-item-text'}))
                        .append(md_lvl_2_content.status_select);
                    var l_div_status_descr = $('<div>')
                        .addClass('request-window-attr-item helper-clearfix')
                        .append($('<label>',{text:'Комментарий',class:'request-window-attr-item-text'}))
                        .append(md_lvl_2_content.status_descr_input);
                    
                    md_lvl_2_content.check_data = function (){
                        if (md_lvl_2_content.status_select.val()!='D' && md_lvl_2_content.status_descr_input.val()==''){
                            $('#md_save_request_status_btn').prop( "disabled",true);
                        }else{
                            $('#md_save_request_status_btn').prop( "disabled",false);
                        }
                    };

                    md_lvl_2_content.status_select.change(function(){
                        if ($(this).val()=='D'){
                            md_lvl_2_content.status_descr_input.removeClass('required');
                        }else{
                            md_lvl_2_content.status_descr_input.addClass('required');
                        }
                        md_lvl_2_content.check_data(); 
                    });
                    
                    md_lvl_2_content.status_descr_input.keyup(function(){
                        md_lvl_2_content.check_data();
                    });
                    
                    $('<div>')
                        .addClass('request-window-attr')
                        .append(l_div_status)
                        .append(l_div_status_descr)
                        .appendTo(md_lvl_2_content);

                    md_lvl_2_content.dialog({
                        resizable:false,
                        modal:true,
                        width: 'auto',
                        buttons:{
                            'Сохранить': {
                                text: "Сохранить",
                                id: "md_save_request_status_btn",
                                click: function(){
                                    md_content.dialog("close");
                                    md_lvl_2_content.dialog("close");
                                    
                                    if (save_request_status_ajax()=='done'){
                                        p_document.request_content_mas.forEach(function(request){
                                            if (request.request_id == p_request_id){
                                                request.remove();
                                                delete p_document.request_content_mas[request.pos];
                                            }
                                        });
                                        
                                        create_info_modal_dialog_new('Оповещение','Процедура завершилась успешно!');/*функция из файла context_menu.js*/
                                    }else{
                                        create_info_modal_dialog_new('Ошибка','Процедура завершилась с ошибкой!!!');
                                    }
                                    
                                }   
                            },
                            'Закрыть': function(){
                                md_lvl_2_content.dialog("close");
                            }
                        },
                        close: function() {
                            md_lvl_2_content.remove();
                        }
                    });
                }
            },
            'Закрыть форму': function(){
                md_content.dialog("close");
            }
        },
        close: function() {
            md_content.remove();
        }
    });
    
   md_content.deadline_date_input.triggerHandler('blur');
    //p_request_id == null
    //r_create_request user_id p_created_by_id
    if (p_request_id != null && !p_document.r_change_request){
        $('#md_save_request_btn').hide();
    }
    if (p_request_id == null || (user_id!=p_created_by_id&&!p_document.r_change_request)){
        $('#md_close_request_btn').hide();
    }
}

function call_create_request_window(p_task,p_cars){
    create_request_window(l_request_this,null,null,null,p_task,p_cars);
}