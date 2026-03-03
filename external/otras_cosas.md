añadir un modulo que compruebe el tiempo de session para que si esta vencida, poder logarme de nuevo antes de ejecutar cualquier scraper.
agragar funcionalidad para poder facilitar el login de nuevo.

¿como es posible que haya fallos al obtener videos de un curso y aun asi lo ponga en la bbdd como completado? ¿Cuales son los estados de Couse_assets?


---- 
V2: clean code

const safeName = urlObj.pathname.replace(/[^a-z0-9]/gi, '_').replace(/^_+|_+$/g, ''); puede utilizar la utileria de nameUtils: getAssetFilename sin pasar el index??????