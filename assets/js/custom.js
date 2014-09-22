(function($){
   	
   	// Preloader 	 
   	$(window).load(function() { 
       	$('#status').fadeOut();
        $('#preloader').delay(350).fadeOut('slow'); 
        $('body').delay(350).css({'overflow':'visible'});
    }); 

	$(document).ready(function() {
		
		// Image background
		$.vegas({
            src:'assets/images/bg1.jpg'
        });

        $.vegas('overlay', {
            src:'assets/images/06.png'
        });

		var countdown =  $('.countdown-time');

		createTimeCicles();

		$(window).on('resize', windowSize);

		function windowSize(){
			countdown.TimeCircles().destroy();
		    createTimeCicles();
			countdown.on('webkitAnimationEnd mozAnimationEnd oAnimationEnd animationEnd', function() {
        		countdown.removeClass('animated bounceIn');
        	});
		}

		// TimeCicles - Create and Options
		function createTimeCicles() {
			countdown.addClass('animated bounceIn');
			countdown.TimeCircles({
				bg_width: 1,
    			fg_width: 0.04,
				circle_bg_color: '#bbb',
				time: {
    				    Days: {color: '#fff'}
    			,	   Hours: {color: '#fff'}
    			,	 Minutes: {color: '#fff'}
    			,	 Seconds: {color: '#fff'}
    			}
			});
			countdown.on('webkitAnimationEnd mozAnimationEnd oAnimationEnd animationEnd', function() {
        		countdown.removeClass('animated bounceIn');
        	});
		}

		// Tooltips
		$('.more-links a, .social a').tooltip();
	
		$('.more-links a, .social a').on('click', function () {
			$(this).tooltip('hide')
		});
			
	});
})(jQuery);
