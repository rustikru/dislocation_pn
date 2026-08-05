(function( $ ) {
    $.widget( "custom.combobox", {
        options: {
            menuMaxHeight: null,/*должен быть ввиде: 10em,10px add KuchukbaevRF*/
            menuWidth:null,      /*должен быть ввиде: 10 (просто число) add KuchukbaevRF*/
            use_val: false      /*add KuchukbaevRF*/
	},
        _create: function() {
            this.wrapper = $( "<span>" )
                                .addClass( "custom-combobox" )
                                .insertAfter( this.element );
        
            this.element.hide();
            this._createAutocomplete();
            this._createShowAllButton();
            this._syncInputFromSelect();
        },
 
         _createAutocomplete: function() {
            var selected = this.element.children( ":selected" ),
            val = this.options.use_val ? selected.val() : selected.text(),
            value = val ? val : "";
            var l_width = this.element.css('width');
            
            this.input = $( "<input>" )
                .appendTo( this.wrapper )
                .val( value )
                .attr( "title", "" )
                .addClass( "custom-combobox-input ui-widget ui-corner-left "+(this.element.hasClass('required')?'required':'') )
                .css({'border':'1px solid #AAA'})
                .css({'width':(l_width ? l_width : '')})
                .autocomplete({
                    appendTo: document.body,
                    delay: 0,
                    minLength: 0,
                    menuMaxHeight:this.options.menuMaxHeight,
                    menuWidth:this.options.menuWidth,
                    source: $.proxy( this, "_source" ),
                    open: $.proxy(function() {
                        this._applyMenuSizing();
                    }, this)
                  })
                .tooltip({
                    tooltipClass: "ui-state-highlight"
                });

            this._customizeAutocomplete();
 
            this._on( this.input, {
                autocompleteselect: function( event, ui ) {
                    ui.item.option.selected = true;
                    if (ui.item.option.disabled){
                        this.input.val('');
                        this.element.children("option:enabled:first-child").prop('selected', true);
                        this.element.trigger('change');
                        this.element.trigger('select');
                        return false;
                    }
                    this._syncInputFromSelect();
                    this._trigger( "select", event, {
                        item: ui.item.option
                    });
                    this.input.triggerHandler("keyup");
                    this.element.trigger('change');
                    this.element.trigger('select');
                },
                autocompletechange: "_removeIfInvalid"
            });

            this._on( this.element, {
                change: function() {
                    this._syncInputFromSelect();
                }
            });
        },
 
        _createShowAllButton: function() {
            var input = this.input;
            var l_input_height = input.outerHeight();
            
            wasOpen = false;
            
            $( "<a>" )
                .attr( "tabIndex", -1 )
                /*.attr( "title", "Показать все станции" )*/
                .tooltip()
                .appendTo( this.wrapper )
                .button({
                    icons: {
                        primary: "ui-icon-triangle-1-s"
                    },
                    text: false
                })
                .removeClass( "ui-corner-all" )
                .addClass( "custom-combobox-toggle ui-corner-right" )
                .css({'vertical-align':'top','height':((l_input_height-2)+'px')})
                .on("mousedown", function() {
                    wasOpen = input.autocomplete( "widget" ).is( ":visible" );
                })
                .on("click", function() {
                    if (input.length) {
                        input[0].focus();
                    }

                    // Close if already visible
                    if ( wasOpen ) {
                        return;
                    }

                    // Pass empty string as value to search for, displaying all results
                    input.autocomplete( "search", "" );
                    setTimeout(function() {
                        var instance = input.autocomplete("instance");
                        if (instance && instance.menu && instance.menu.element) {
                            instance.menu.element.show();
                        }
                    }, 0);
                });
        },

        _customizeAutocomplete: function() {
            var instance = this.input.autocomplete("instance");

            if (!instance) {
                return;
            }

            instance._renderItem = function(ul, item) {
                var li = $("<li>");
                var content = $("<div>").text(item.label);

                if (item.title) {
                    li.attr("title", item.title);
                }

                if (item.style) {
                    li.attr("style", item.style);
                }

                if (item.disabled) {
                    li.addClass("ui-state-disabled disabled");
                }

                return li.append(content).appendTo(ul);
            };

            instance._resizeMenu = function() {
                var ul = this.menu.element;
                var desiredWidth = this.element.outerWidth();
                var configuredWidth = parseInt(this.options.menuWidth, 10);

                if (!isNaN(configuredWidth)) {
                    desiredWidth = Math.max(desiredWidth, configuredWidth);
                }

                ul.outerWidth(desiredWidth);
            };
        },

        _applyMenuSizing: function() {
            var menu = this.input.autocomplete("widget");
            var dialog = this.wrapper.closest(".ui-dialog");
            var dialogZIndex = parseInt(dialog.css("z-index"), 10);
            var menuZIndex = !isNaN(dialogZIndex) ? dialogZIndex + 1 : 10050;

            if (!menu || !menu.length) {
                return;
            }

            menu.css({
                "overflow-y": "auto",
                "overflow-x": "hidden"
            });

            if (this.options.menuMaxHeight) {
                menu.css("max-height", this.options.menuMaxHeight);
            }

            if (this.options.menuWidth) {
                menu.css({
                    "min-width": this.options.menuWidth,
                    "width": this.options.menuWidth
                });
            }

            // Keep the autocomplete menu above the current dialog and overlay.
            menu.css("z-index", menuZIndex);
        },
 
        _source: function( request, response ) {
            var count=0;
            var matcher = new RegExp( $.ui.autocomplete.escapeRegex(request.term), "i" );
            var l_use_val = this.options.use_val;
            
            response( this.element.children( "option" ).map(function() {
                var text = $( this ).text();
                var val = $( this ).val();
                if ( this.value && ( !request.term || matcher.test(text) ) && count<100) {
                    count++;
                    return {
                        label: text,
                        value: (l_use_val ? val : text),
                        option: this,
                        style: (request.term=='' ? this.style.cssText : ''),
                        disabled: this.disabled,
                        title: $(this).attr('title')
                    };
                }
            }));
        },
 
        _removeIfInvalid: function( event, ui ) {
 
            // Selected an item, nothing to do
            if ( ui.item ) {
                return;
            }
                
            // Search for a match (case-insensitive)
            var l_use_val = this.options.use_val;
            var value = this.input.val(),
            valueLowerCase = value.toLowerCase(),
            valid = false;
            this.element.children( "option:enabled" ).each(function() {
                var searche_text = l_use_val ? $(this).val() : $(this).text();
                
                if ( searche_text.toLowerCase() === valueLowerCase ) {
                    this.selected = valid = true;
                    return false;
                } 
            });
 
            // Found a match, nothing to do
            if ( valid ) {
                this._syncInputFromSelect();
                this.element.trigger('change');
                this.element.trigger('select');
                return;
            }
 
            // Remove invalid value
            this.input.val( "" )
                      .attr( "title", value + " нет такого элемента или он заблокирован" )
                      .tooltip( "open" );
            this.element.val( "" );
            this._delay(function() {
                this.input.tooltip( "close" ).attr( "title", "" );
            }, 2500 );
            this.input.autocomplete( "instance" ).term = "";
            this.element.trigger('change');
            this.element.trigger('select');
        },

        _syncInputFromSelect: function() {
            if (!this.input || !this.element) {
                return;
            }

            var selected = this.element.children(":selected");
            var value = "";

            if (selected.length) {
                value = this.options.use_val ? selected.val() : selected.text();
            }

            this.input.val(value || "");
        },
 
        _destroy: function() {
            this.wrapper.remove();
            this.element.show();
        },
        
        clear:function(){
            this.input.val('');
        }
    });
})( jQuery );
