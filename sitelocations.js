        // 初始化地图
        function initMap() {
            // 默认坐标（香港）
            const defaultLocation = { lat: 22.3193, lng: 114.1694 };
            
            // 创建地图
            const map = new google.maps.Map(document.getElementById('site-map'), {
                zoom: 12,
                center: defaultLocation,
                styles: [
                    {
                        "featureType": "administrative",
                        "elementType": "labels.text.fill",
                        "stylers": [{"color": "#444444"}]
                    },
                    {
                        "featureType": "landscape",
                        "stylers": [{"color": "#f2f2f2"}]
                    },
                    {
                        "featureType": "poi",
                        "stylers": [{"visibility": "off"}]
                    },
                    {
                        "featureType": "road",
                        "stylers": [{"saturation": -100}, {"lightness": 45}]
                    },
                    {
                        "featureType": "road.highway",
                        "stylers": [{"visibility": "simplified"}]
                    },
                    {
                        "featureType": "road.arterial",
                        "elementType": "labels.icon",
                        "stylers": [{"visibility": "off"}]
                    },
                    {
                        "featureType": "transit",
                        "stylers": [{"visibility": "off"}]
                    },
                    {
                        "featureType": "water",
                        "stylers": [{"color": "#3498db"}, {"visibility": "on"}]
                    }
                ]
            });
            
            // 添加标记
            const markers = [];
            const siteItems = document.querySelectorAll('.site-item');
            
            siteItems.forEach(item => {
                const lat = parseFloat(item.getAttribute('data-lat'));
                const lng = parseFloat(item.getAttribute('data-lng'));
                const title = item.querySelector('h3').textContent;
                
                const marker = new google.maps.Marker({
                    position: { lat, lng },
                    map: map,
                    title: title,
                    icon: {
                        url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                    }
                });
                
                markers.push(marker);
                
                // 添加点击事件
                item.addEventListener('click', () => {
                    // 移除所有active类
                    siteItems.forEach(site => site.classList.remove('active'));
                    // 添加active类到当前项
                    item.classList.add('active');
                    // 移动地图到该标记
                    map.panTo({ lat, lng });
                    map.setZoom(14);
                });
            });
            
            // 搜索功能
            const siteSearch = document.getElementById('site-search');
            siteSearch.addEventListener('input', () => {
                const searchTerm = siteSearch.value.toLowerCase();
                
                siteItems.forEach(item => {
                    const siteName = item.querySelector('h3').textContent.toLowerCase();
                    if (siteName.includes(searchTerm)) {
                        item.style.display = 'flex';
                    } else {
                        item.style.display = 'none';
                    }
                });
            });
        }
        
        // 设置当前日期
        document.addEventListener('DOMContentLoaded', function() {
            const today = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            document.getElementById('current-date').textContent = today.toLocaleDateString('en-US', options);

             // 添加搜索和筛选功能
            setupFilters();
        });

        
        // 设置筛选功能
        function setupFilters() {
            const siteSearch = document.getElementById('site-search');
            const siteType = document.getElementById('site-type');
            const siteStatus = document.getElementById('site-status');
            const sortBy = document.getElementById('sort-by');
            
            // 添加事件监听器
            siteSearch.addEventListener('input', filterSites);
            siteType.addEventListener('change', filterSites);
            siteStatus.addEventListener('change', filterSites);
            sortBy.addEventListener('change', filterSites);
            
            // 初始筛选
            filterSites();
        }
        
        // 筛选工地函数
        function filterSites() {
            const searchTerm = document.getElementById('site-search').value.toLowerCase();
            const typeFilter = document.getElementById('site-type').value;
            const statusFilter = document.getElementById('site-status').value;
            const sortBy = document.getElementById('sort-by').value;
            
            const siteItems = document.querySelectorAll('.site-item');
            const visibleSites = [];
            
            siteItems.forEach(item => {
                const siteName = item.querySelector('h3').textContent.toLowerCase();
                const siteType = item.getAttribute('data-type');
                const siteStatus = item.getAttribute('data-status');
                
                // 应用筛选条件
                const matchesSearch = siteName.includes(searchTerm);
                const matchesType = typeFilter === 'all' || siteType === typeFilter;
                const matchesStatus = statusFilter === 'all' || siteStatus === statusFilter;
                
                if (matchesSearch && matchesType && matchesStatus) {
                    item.style.display = 'flex';
                    visibleSites.push(item);
                } else {
                    item.style.display = 'none';
                }
            });
            
            // 排序
            sortSites(visibleSites, sortBy);
            
            // 更新地图标记（在实际实现中）
            updateMapMarkers(visibleSites);
        }
        
        // 排序函数
        function sortSites(sites, sortBy) {
            const siteList = document.querySelector('.site-list');
            
            // 根据选择的排序方式排序
            sites.sort((a, b) => {
                if (sortBy === 'name') {
                    return a.querySelector('h3').textContent.localeCompare(b.querySelector('h3').textContent);
                } else if (sortBy === 'date') {
                    const dateA = new Date(a.querySelector('p').textContent.replace('Last updated: ', ''));
                    const dateB = new Date(b.querySelector('p').textContent.replace('Last updated: ', ''));
                    return dateB - dateA;
                } else if (sortBy === 'status') {
                    return a.getAttribute('data-status').localeCompare(b.getAttribute('data-status'));
                }
                return 0;
            });
            
            // 重新排列DOM元素
            sites.forEach(site => {
                siteList.appendChild(site);
            });
        }
        
        // 更新地图标记（伪代码）
        function updateMapMarkers(visibleSites) {
            // 在实际实现中，这里会更新地图上显示的标记
            // 根据visibleSites数组显示或隐藏标记
            console.log('Updating map to show ' + visibleSites.length + ' sites');
            
            // 示例：如果有可见的工地，将地图中心设置为第一个可见工地
            if (visibleSites.length > 0) {
                const firstSite = visibleSites[0];
                const lat = firstSite.getAttribute('data-lat');
                const lng = firstSite.getAttribute('data-lng');
                
                // 在实际实现中，这里会调用地图API
                // map.panTo({lat: parseFloat(lat), lng: parseFloat(lng)});
            }
        }
        
        // 添加工地点击事件
        document.querySelectorAll('.site-item').forEach(item => {
            item.addEventListener('click', function() {
                // 移除所有active类
                document.querySelectorAll('.site-item').forEach(site => {
                    site.classList.remove('active');
                });
                
                // 添加active类到当前项
                this.classList.add('active');
                
                // 移动地图到该标记（在实际实现中）
                const lat = this.getAttribute('data-lat');
                const lng = this.getAttribute('data-lng');
                
                // 在实际实现中，这里会调用地图API
                // map.panTo({lat: parseFloat(lat), lng: parseFloat(lng)});
                // map.setZoom(14);
                
                console.log('Selected site: ' + this.querySelector('h3').textContent);
            });
        });