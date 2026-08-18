-- ==========================================================================
-- TACTICAL ERP -- Asignar nombre y rol a los 6 usuarios ya creados
-- Corre esto DESPUÉS de haber creado los 6 en Authentication -> Users.
-- Busca cada cuenta por su correo, no hace falta copiar ningún ID a mano.
-- ==========================================================================

insert into public.usuarios (id, nombre, rol)
select id, nombre, rol from (values
  ('gerencia@tacticalmg.co',        'Helver Conde',         'administrador'),
  ('norely.sarmiento@gmail.com',    'Norely Sarmiento',     'administrador'),
  ('comercial@tacticalmg.co',       'Norely Sarmiento',     'comercial'),
  ('diseno@tacticalmg.co',          'Diseñador',            'diseno'),
  ('producciontactical@gmail.com',  'Sebastian Montenegro', 'produccion'),
  ('contacto@tacticalmg.co',        'Yasmid Conde',         'contabilidad')
) as datos(correo, nombre, rol)
join auth.users u on lower(u.email) = lower(datos.correo);

-- Verificación: debe mostrar las 6 filas con su nombre y rol.
select nombre, rol from public.usuarios order by rol;
