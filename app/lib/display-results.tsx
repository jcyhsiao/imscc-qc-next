import { Module } from '@/app/lib/definitions';
      
      /**
         * Render the course structure accordion.
         * Implementation mirrors original behavior.
         */
        export function displayModules(modules: Module[]) {
            const container = document.getElementById('course-structure')!;
            container.innerHTML = '';
            if (!modules.length) {
                container.innerHTML = '<p class="text-gray-500">No course structure found in manifest.</p>';
                return;
            }

            modules.forEach(module => {
                const accordionDiv = document.createElement('div');
                accordionDiv.className = 'border border-gray-200 rounded-lg';

                const button = document.createElement('button');
                button.className = 'accordion-header w-full flex justify-between items-center p-4 text-left font-semibold text-gray-800 bg-gray-50 hover:bg-gray-100 focus:outline-none';

                const statusIndicator = module.status === 'active'
                    ? DEFAULT_BADGES.status.published
                    : DEFAULT_BADGES.status.unpublished;

                button.innerHTML = `
                        <span class="truncate pr-4">${module.title}</span>
                        <div class="flex items-center flex-shrink-0">
                            ${statusIndicator}
                            <svg class="w-5 h-5 transform transition-transform ml-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    `;

                const content = document.createElement('div');
                content.className = 'accordion-content bg-white';

                const innerContent = document.createElement('div');
                innerContent.className = 'p-4 border-t border-gray-200';

                const ul = document.createElement('ul');
                ul.className = 'space-y-3';

                module.items.forEach(item => {
                    const li = document.createElement('li');
                    li.className = 'flex items-center justify-between text-gray-700';

                    // Use numeric indent from module_meta.xml (safe default 0)
                    const rawIndent = item.indent; // Use the indent from the item directly
                    const indentLevel = Number.isFinite(rawIndent) ? Math.max(0, Math.floor(rawIndent)) : 0;

                    // Apply visual indentation (padding-left) so layout remains stable.
                    li.style.paddingLeft = `${indentLevel * 1.5}rem`;

                    // Get the correct type details from allCourseContent
                    const itemClarifiedType = (item.clarifiedType != 'tbd' && item.clarifiedType != 'unspecified') ? item.clarifiedType : item.contentType;
                    const typeDetails = getItemTypeDetails(itemClarifiedType.toLowerCase());
                    const itemStatusIndicator = item.status === 'active'
                        ? DEFAULT_BADGES.status.published
                        : DEFAULT_BADGES.status.unpublished;

                    li.innerHTML = `
                            <div class="flex items-center flex-grow min-w-0">
                                ${typeDetails.icon}
                                <span class="truncate" title="${item.title}">${item.title}</span>
                            </div>
                            <div class="flex items-center flex-shrink-0 ml-4 space-x-2">
                                <span class="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded-md">${typeDetails.label}</span>
                                ${itemStatusIndicator}
                            </div>
                        `;
                    ul.appendChild(li);
                });

                innerContent.appendChild(ul);
                content.appendChild(innerContent);
                accordionDiv.appendChild(button);
                accordionDiv.appendChild(content);
                container.appendChild(accordionDiv);
            });

            // Add accordion toggle functionality
            container.querySelectorAll('.accordion-header').forEach(button => {
                button.addEventListener('click', () => {
                    const content = button.nextElementSibling;
                    const icon = button.querySelector('svg');

                    if (content instanceof HTMLElement && icon) {
                        if (content.style.maxHeight.charAt(0) !== '0') {
                            content.style.maxHeight = '0px';
                            icon.classList.remove('rotate-180');
                        } else {
                            content.style.maxHeight = 'fit-content';
                            icon.classList.add('rotate-180');
                        }
                    }
                });
            });
        }