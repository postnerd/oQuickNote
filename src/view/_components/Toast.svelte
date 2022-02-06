<script>
    import { fade, fly } from 'svelte/transition';
    
    let visible = false;
    let type = "info";
    let message;
    let duration;

    export let top;

    export const show = (typeToShow, messageToShow, durationForShowing, afterHandler) => {
        type = typeToShow;
        message = messageToShow;
        duration = durationForShowing;

        visible = true;
        
        window.setTimeout(() => {
            visible = false;
            
            if (afterHandler)
                afterHandler();
        }, duration); 
    };
</script>

{#if visible}
    <div class="toast {type}" style="--top: {top}" in:fly="{{ y: -200, duration: duration }}" out:fade>
        {message}
    </div>
{/if}

<style>
    .toast {
        position: absolute;
        width: 80%;
        top: var(--top);
        height: 35px;
        line-height: 35px;
        font-size: smaller;
        text-align: center;
        margin-left: 10%;
        margin-right: 10%;
        z-index: 1;
        color: white;
    }

    .info {
        background-color: #3498DB;
    }

    .error {
        background-color: #E74C3C;
    }

    .success {
        background-color: #2ECC71;
    }
</style>